import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminUser {
  id: string;
  stringId: string;
  name: string;
  email: string;
  avatar: string | null;
  role: 'user' | 'admin';
  status: 'active' | 'blocked';
  onboardingStep: number;
  createdAt: string;
}

export interface AdminEvent {
  id: string;
  sport: string;
  title: string;
  locationName: string;
  startDatetime: string;
  status: string;
  isPublic: boolean;
  organizerId: string;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  totalEvents: number;
  openEvents: number;
  totalParticipations: number;
  eventsThisWeek: number;
  newUsersThisMonth: number;
  topSports: { sport: string; count: number }[];
}

export interface AdminNotification {
  id: string;
  userId: string | null;
  eventId: string | null;
  title: string;
  body: string;
  type: 'broadcast' | 'event' | 'system';
  createdAt: string;
}

export interface PagedResult<T> {
  users?: T[];
  events?: T[];
  total: number;
  page: number;
  limit: number;
}

const BASE = `${environment.apiUrl}/admin`;

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  // Users
  getUsers(page = 1, search = ''): Observable<PagedResult<AdminUser>> {
    const params: Record<string, string> = { page: String(page), limit: '20' };
    if (search) params['search'] = search;
    return this.http.get<PagedResult<AdminUser>>(`${BASE}/users`, { params });
  }

  blockUser(id: string): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${BASE}/users/${id}/block`, {});
  }

  activateUser(id: string): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${BASE}/users/${id}/activate`, {});
  }

  changeRole(id: string, role: 'user' | 'admin'): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${BASE}/users/${id}/role`, { role });
  }

  // Events
  getEvents(page = 1): Observable<PagedResult<AdminEvent>> {
    return this.http.get<PagedResult<AdminEvent>>(`${BASE}/events`, {
      params: { page: String(page), limit: '20' },
    });
  }

  blockEvent(id: string): Observable<AdminEvent> {
    return this.http.patch<AdminEvent>(`${BASE}/events/${id}/block`, {});
  }

  activateEvent(id: string): Observable<AdminEvent> {
    return this.http.patch<AdminEvent>(`${BASE}/events/${id}/activate`, {});
  }

  // Stats
  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${BASE}/stats`);
  }

  // Notifications
  broadcast(title: string, body: string): Observable<AdminNotification> {
    return this.http.post<AdminNotification>(`${BASE}/notifications/broadcast`, { title, body });
  }

  notifyEvent(eventId: string, title: string, body: string): Observable<{ count: number }> {
    return this.http.post<{ count: number }>(`${BASE}/notifications/event/${eventId}`, { title, body });
  }

  getRecentNotifications(): Observable<AdminNotification[]> {
    return this.http.get<AdminNotification[]>(`${BASE}/notifications`);
  }

  getOpenEvents(): Observable<PagedResult<AdminEvent>> {
    return this.http.get<PagedResult<AdminEvent>>(`${BASE}/events`, {
      params: { page: '1', limit: '100' },
    });
  }
}
