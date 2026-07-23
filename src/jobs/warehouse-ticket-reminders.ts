import { WarehouseTicketsService } from "@/modules/warehouse-tickets/warehouse-tickets.service";

const REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function startWarehouseTicketReminderJob() {
  const service = new WarehouseTicketsService();

  const run = () => {
    service.processReturnReminders().catch((error) => {
      // eslint-disable-next-line no-console
      console.error("Warehouse ticket return reminder job failed:", error);
    });
  };

  setTimeout(run, 60_000);
  setInterval(run, REMINDER_INTERVAL_MS);
}
