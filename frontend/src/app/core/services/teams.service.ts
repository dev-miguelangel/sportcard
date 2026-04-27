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
  isAmateur: boolean;
  teamId: string;
  iconName: string;
  backgroundColor: string;
  iconColor: string;
}

export interface TeamMemberItem {
  userId: string;
  stringId: string;
  name: string;
  avatar: string | null;
  sports: string[];
  position: string | null;
  joinedAt: string;
  status: 'invited' | 'confirmed' | 'rejected';
}

export interface TeamPublicDto {
  id: string;
  name: string;
  sport: string;
  logoUrl: string | null;
  createdAt: string;
  isAmateur: boolean;
  teamId: string;
  iconName: string;
  backgroundColor: string;
  iconColor: string;
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

  removeMember(teamId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/teams/${teamId}/members/${userId}`);
  }

  deleteTeam(teamId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/teams/${teamId}`);
  }

  createTeam(dto: { name: string; sport: string; iconName: string; backgroundColor: string; iconColor: string }): Observable<TeamSummary> {
    return this.http.post<TeamSummary>(`${environment.apiUrl}/teams`, dto);
  }

  addMember(teamId: string, userId: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/teams/${teamId}/members`, { userId });
  }

  inviteMember(teamId: string, userId: string): Observable<void> {
    return this.addMember(teamId, userId);
  }

  findByTeamId(teamId: string): Observable<{ id: string; teamId: string; name: string; sport: string; iconName: string; backgroundColor: string; iconColor: string }> {
    return this.http.get<{ id: string; teamId: string; name: string; sport: string; iconName: string; backgroundColor: string; iconColor: string }>(`${environment.apiUrl}/teams/find?teamId=${teamId}`);
  }
}
