import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Activity {
  id: string;
  userId: string;
  sport: string;
  notes: string | null;
  durationMinutes: number | null;
  loggedAt: string;
  createdAt: string;
}

export interface CreateActivityPayload {
  sport: string;
  notes?: string;
  durationMinutes?: number;
  loggedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class ActivitiesService {
  private readonly http = inject(HttpClient);

  log(payload: CreateActivityPayload): Observable<Activity> {
    return this.http.post<Activity>(`${environment.apiUrl}/activities`, payload);
  }

  getMyActivities(): Observable<Activity[]> {
    return this.http.get<Activity[]>(`${environment.apiUrl}/activities`);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/activities/${id}`);
  }
}
