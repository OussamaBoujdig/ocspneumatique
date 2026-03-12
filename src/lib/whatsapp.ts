import { api } from "./api";

interface WhatsAppResponse {
  url: string;
  message: string;
  phone: string;
}

export async function sendInvoiceWhatsApp(invoiceId: number): Promise<string> {
  const data = await api.get<WhatsAppResponse>(`/whatsapp/invoice/${invoiceId}`);
  window.open(data.url, "_blank");
  return data.url;
}

export async function sendAppointmentConfirmWhatsApp(appointmentId: number): Promise<string> {
  const data = await api.get<WhatsAppResponse>(`/whatsapp/appointment-confirm/${appointmentId}`);
  window.open(data.url, "_blank");
  return data.url;
}

export async function sendAppointmentReminderWhatsApp(appointmentId: number): Promise<string> {
  const data = await api.get<WhatsAppResponse>(`/whatsapp/appointment-reminder/${appointmentId}`);
  window.open(data.url, "_blank");
  return data.url;
}

export async function sendCompletionWhatsApp(appointmentId: number): Promise<string> {
  const data = await api.get<WhatsAppResponse>(`/whatsapp/completion/${appointmentId}`);
  window.open(data.url, "_blank");
  return data.url;
}

export interface ReminderAppointment {
  id: number;
  full_name: string;
  phone: string;
  preferred_date: string;
  preferred_time: string;
  service_type: string;
  status: string;
  whatsapp_url: string | null;
}

export async function getTomorrowReminders(): Promise<ReminderAppointment[]> {
  return api.get<ReminderAppointment[]>("/whatsapp/reminders/tomorrow");
}
