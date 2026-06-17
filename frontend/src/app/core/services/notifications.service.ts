import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AppNotification {
  id: string;
  userId: string | null;
  eventId: string | null;
  title: string;
  body: string;
  type: 'broadcast' | 'event' | 'system' | 'invitation' | 'team_invite' | 'match_scheduled' | 'match_result' | 'tournament_update' | 'guardian_approval';
  readAt: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);

  getMyNotifications(): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(`${environment.apiUrl}/notifications/mine`);
  }

  markRead(id: string): Observable<AppNotification> {
    return this.http.patch<AppNotification>(`${environment.apiUrl}/notifications/${id}/read`, {});
  }
}
