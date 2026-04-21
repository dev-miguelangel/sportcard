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
  description?: string;
  maxParticipants?: number;
  isPublic?: boolean;
  requiresApproval?: boolean;
}

export interface EventResponse {
  id: string;
  sport: string;
  type: string;
  title: string;
  description: string | null;
  locationName: string;
  startDatetime: string;
  endDatetime: string | null;
  maxParticipants: number | null;
  isPublic: boolean;
  requiresApproval: boolean;
  shareToken: string;
  status: string;
  organizerId: string;
  createdAt: string;
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
}
