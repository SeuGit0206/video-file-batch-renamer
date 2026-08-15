import type { MonitoringSummary } from './ReportingService';

export interface NotificationAlert {
  id: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  timestamp: string;
}

export type NotificationHandler = (alert: NotificationAlert) => void;

export interface INotificationService {
  registerHandler(handler: NotificationHandler): void;
  notifyAlert(severity: NotificationAlert['severity'], title: string, message: string): void;
  notifyReportSummary(summary: MonitoringSummary): void;
  getAlertHistory(): NotificationAlert[];
  clearHistory(): void;
}

export class NotificationService implements INotificationService {
  private handlers: Set<NotificationHandler> = new Set();
  private alertHistory: NotificationAlert[] = [];

  public registerHandler(handler: NotificationHandler): void {
    this.handlers.add(handler);
  }

  public notifyAlert(
    severity: NotificationAlert['severity'],
    title: string,
    message: string
  ): void {
    const alert: NotificationAlert = {
      id: Math.random().toString(36).substring(2, 10),
      severity,
      title,
      message,
      timestamp: new Date().toISOString(),
    };

    this.alertHistory.push(alert);

    for (const handler of this.handlers) {
      try {
        handler(alert);
      } catch (err) {
        console.error('[NotificationService] Handler failed:', err);
      }
    }
  }

  public notifyReportSummary(summary: MonitoringSummary): void {
    const isCritical = summary.overallScorePercentage < 70;
    const isWarning = summary.overallScorePercentage >= 70 && summary.overallScorePercentage < 95;
    const severity = isCritical ? 'CRITICAL' : isWarning ? 'WARNING' : 'INFO';

    this.notifyAlert(
      severity,
      'Synthetic Monitoring Summary Report',
      `Overall Health Score: ${summary.overallScorePercentage}%. System status: ${summary.healthReport.systemStatus}`
    );
  }

  public getAlertHistory(): NotificationAlert[] {
    return [...this.alertHistory];
  }

  public clearHistory(): void {
    this.alertHistory = [];
  }
}
