import { Router } from "express";
import pool from "../db.js";

const router = Router();

function cleanPhone(phone) {
  let p = phone.replace(/[\s.\-()]/g, "");
  if (p.startsWith("0")) p = "33" + p.slice(1);
  if (!p.startsWith("+")) p = "+" + p;
  return p.replace("+", "");
}

function buildInvoiceMessage(invoice, items) {
  const date = new Date(invoice.created_at).toLocaleDateString("fr-FR");
  let msg = `📋 *Facture ${invoice.invoice_number}*\n`;
  msg += `📅 Date: ${date}\n`;
  msg += `👤 Client: ${invoice.client_name || "—"}\n\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n`;

  if (items?.length) {
    for (const item of items) {
      msg += `▪ ${item.description}\n`;
      msg += `  ${item.quantity} x ${Number(item.unit_price).toFixed(2)}€ = *${Number(item.total).toFixed(2)}€*\n`;
    }
    msg += `━━━━━━━━━━━━━━━━━━\n`;
  }

  msg += `\n💰 Sous-total HT: ${Number(invoice.subtotal).toFixed(2)}€\n`;
  msg += `📊 TVA (${invoice.tax_rate}%): ${Number(invoice.tax_amount).toFixed(2)}€\n`;
  msg += `✅ *Total TTC: ${Number(invoice.total).toFixed(2)}€*\n`;

  if (invoice.due_date) {
    msg += `\n⏰ Échéance: ${invoice.due_date}\n`;
  }
  if (invoice.notes) {
    msg += `\n📝 ${invoice.notes}\n`;
  }

  msg += `\n—\n🔧 *OCS PNEUS*\n📍 123 Avenue de l'Automobile, Paris\n📞 01 23 45 67 89`;
  return msg;
}

function buildAppointmentConfirmMessage(appointment) {
  let msg = `✅ *Confirmation de rendez-vous*\n\n`;
  msg += `Bonjour ${appointment.full_name},\n\n`;
  msg += `Votre rendez-vous chez *OCS PNEUS* est confirmé:\n\n`;
  msg += `📅 Date: *${appointment.preferred_date}*\n`;
  msg += `🕐 Heure: *${appointment.preferred_time}*\n`;
  msg += `🔧 Service: ${appointment.service_type}\n`;
  if (appointment.vehicle_brand) {
    msg += `🚗 Véhicule: ${appointment.vehicle_brand} ${appointment.vehicle_model || ""}\n`;
  }
  msg += `\n📍 123 Avenue de l'Automobile, 75000 Paris\n`;
  msg += `📞 01 23 45 67 89\n\n`;
  msg += `À bientôt!\n🔧 *OCS PNEUS*`;
  return msg;
}

function buildAppointmentReminderMessage(appointment) {
  let msg = `⏰ *Rappel de rendez-vous*\n\n`;
  msg += `Bonjour ${appointment.full_name},\n\n`;
  msg += `Nous vous rappelons votre rendez-vous *demain*:\n\n`;
  msg += `📅 Date: *${appointment.preferred_date}*\n`;
  msg += `🕐 Heure: *${appointment.preferred_time}*\n`;
  msg += `🔧 Service: ${appointment.service_type}\n`;
  if (appointment.vehicle_brand) {
    msg += `🚗 Véhicule: ${appointment.vehicle_brand} ${appointment.vehicle_model || ""}\n`;
  }
  msg += `\n📍 123 Avenue de l'Automobile, 75000 Paris\n`;
  msg += `📞 01 23 45 67 89\n\n`;
  msg += `À demain!\n🔧 *OCS PNEUS*`;
  return msg;
}

function buildCompletionMessage(appointment) {
  let msg = `🎉 *Travaux terminés!*\n\n`;
  msg += `Bonjour ${appointment.full_name},\n\n`;
  msg += `Nous avons le plaisir de vous informer que les travaux sur votre véhicule sont terminés.\n\n`;
  msg += `🔧 Service: ${appointment.service_type}\n`;
  if (appointment.vehicle_brand) {
    msg += `🚗 Véhicule: ${appointment.vehicle_brand} ${appointment.vehicle_model || ""}\n`;
  }
  msg += `\nVous pouvez venir récupérer votre véhicule à votre convenance.\n\n`;
  msg += `📍 123 Avenue de l'Automobile, 75000 Paris\n`;
  msg += `📞 01 23 45 67 89\n\n`;
  msg += `Merci de votre confiance!\n🔧 *OCS PNEUS*`;
  return msg;
}

// Generate WhatsApp link for an invoice
router.get("/invoice/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.*, c.full_name as client_name, c.phone as client_phone, c.address as client_address
       FROM invoices i LEFT JOIN clients c ON i.client_id = c.id WHERE i.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Facture non trouvée" });

    const invoice = rows[0];
    if (!invoice.client_phone) return res.status(400).json({ error: "Le client n'a pas de numéro de téléphone" });

    let items = [];
    if (invoice.work_order_id) {
      const [woItems] = await pool.query(
        `SELECT woi.*, s.name as service_name FROM work_order_items woi
         LEFT JOIN services s ON woi.service_id = s.id WHERE woi.work_order_id = ?`,
        [invoice.work_order_id]
      );
      items = woItems;
    }

    const message = buildInvoiceMessage(invoice, items);
    const phone = cleanPhone(invoice.client_phone);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    // Mark as sent
    await pool.query("UPDATE invoices SET status = 'sent' WHERE id = ? AND status = 'draft'", [req.params.id]);

    res.json({ url, message, phone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate WhatsApp link for appointment confirmation
router.get("/appointment-confirm/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM appointments WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "RDV non trouvé" });

    const appt = rows[0];
    if (!appt.phone) return res.status(400).json({ error: "Pas de numéro" });

    const message = buildAppointmentConfirmMessage(appt);
    const phone = cleanPhone(appt.phone);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    res.json({ url, message, phone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate WhatsApp link for appointment reminder
router.get("/appointment-reminder/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM appointments WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "RDV non trouvé" });

    const appt = rows[0];
    if (!appt.phone) return res.status(400).json({ error: "Pas de numéro" });

    const message = buildAppointmentReminderMessage(appt);
    const phone = cleanPhone(appt.phone);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    res.json({ url, message, phone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate WhatsApp link for work completion notification
router.get("/completion/:appointmentId", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM appointments WHERE id = ?", [req.params.appointmentId]);
    if (!rows.length) return res.status(404).json({ error: "RDV non trouvé" });

    const appt = rows[0];
    if (!appt.phone) return res.status(400).json({ error: "Pas de numéro" });

    const message = buildCompletionMessage(appt);
    const phone = cleanPhone(appt.phone);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    res.json({ url, message, phone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get tomorrow's appointments for reminder
router.get("/reminders/tomorrow", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM appointments
       WHERE preferred_date = DATE_ADD(CURDATE(), INTERVAL 1 DAY)
       AND status IN ('confirmed','pending')
       ORDER BY preferred_time`
    );
    const results = rows.map((appt) => ({
      ...appt,
      whatsapp_url: appt.phone
        ? `https://wa.me/${cleanPhone(appt.phone)}?text=${encodeURIComponent(buildAppointmentReminderMessage(appt))}`
        : null,
    }));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
