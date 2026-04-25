import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TeamSummary {
  id: string;
  name: string;
  sport: string;
  logoUrl: string | null;
  memberCount: number;
  isCoach: boolean;
  minAge?: number | null;
  maxAge?: number | null;
}

export interface TeamMemberItem {
  userId: string;
  stringId: string;
  name: string;
  avatar: string | null;
  sports: string[];
  position: string | null;
  joinedAt: string;
}

export interface TeamPublicDto {
  id: string;
  name: string;
  sport: string;
  logoUrl: string | null;
  createdAt: string;
  coach: { id: string; stringId: string; name: string; avatar: string | null };
  members: TeamMemberItem[];
  activeTournaments: { id: string; name: string; sport: string; format: string; status: string }[];
}

@Injectable({ providedIn: 'root' })
export class TeamsService {
  private readonly http = inject(HttpClient);

  findMine(): Observable<TeamSummary[]> {
    return this.http.get<TeamSummary[]>(`${environment.apiUrl}/teams/mine`);
  }

  getPublicTeam(id: string): Observable<TeamPublicDto> {
    return this.http.get<TeamPublicDto>(`${environment.apiUrl}/teams/p/${id}`);
  }

  confirmMembership(teamId: string, accept: boolean): Observable<void> {
    return this.http.patch<void>(`${environment.apiUrl}/teams/${teamId}/members/confirm`, { accept });
  }
}
