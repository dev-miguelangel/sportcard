import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CreateEventPayload {
  sport: string;
  type: string;
  title: string;
  locationName: string;
  startDatetime: string;
  endDatetime: string;
  description?: string;
  maxParticipants?: number;
  isPublic?: boolean;
  requiresApproval?: boolean;
}

export type ParticipantStatus = 'approved' | 'pending' | 'waiting' | 'rejected';

export interface EventResponse {
  id: string;
  sport: string;
  type: string;
  title: string;
  description: string | null;
  locationName: string;
  startDatetime: string;
  endDatetime: string;
  maxParticipants: number | null;
  isPublic: boolean;
  requiresApproval: boolean;
  shareToken: string;
  status: 'draft' | 'open' | 'closed' | 'cancelled' | 'finished';
  organizerId: string;
  createdAt: string;
  closingNotes: string | null;
  results: string | null;
  participantCount: number;
  myStatus: ParticipantStatus | null;
}

export interface JoinResult {
  id: string;
  eventId: string;
  userId: string;
  status: ParticipantStatus;
  message: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventPublicPreview {
  id: string;
  title: string;
  sport: string;
  type: string;
  startDatetime: string;
  locationName: string;
  isPublic: boolean;
}

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly http = inject(HttpClient);

  create(payload: CreateEventPayload): Observable<EventResponse> {
    return this.http.post<EventResponse>(`${environment.apiUrl}/events`, payload);
  }

  findAll(): Observable<EventResponse[]> {
    return this.http.get<EventResponse[]>(`${environment.apiUrl}/events`);
  }

  findMine(): Observable<EventResponse[]> {
    return this.http.get<EventResponse[]>(`${environment.apiUrl}/events/mine`);
  }

  findOne(id: string): Observable<EventResponse> {
    return this.http.get<EventResponse>(`${environment.apiUrl}/events/${id}`);
  }

  join(eventId: string, message?: string): Observable<JoinResult> {
    return this.http.post<JoinResult>(`${environment.apiUrl}/events/${eventId}/join`, { message });
  }

  leave(eventId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/events/${eventId}/join`);
  }

  findByToken(shareToken: string): Observable<EventPublicPreview> {
    return this.http.get<EventPublicPreview>(`${environment.apiUrl}/events/token/${shareToken}`);
  }

  inviteUser(eventId: string, identifier: string): Observable<{ success: boolean; userName: string }> {
    return this.http.post<{ success: boolean; userName: string }>(
      `${environment.apiUrl}/events/${eventId}/invite`,
      { identifier },
    );
  }

  closeEvent(id: string, dto: { closingNotes?: string; results?: string }): Observable<EventResponse> {
    return this.http.patch<EventResponse>(`${environment.apiUrl}/events/${id}/close`, dto);
  }
}
