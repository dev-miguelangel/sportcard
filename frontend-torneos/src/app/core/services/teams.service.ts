import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TeamMemberItem {
  userId: string;
  stringId: string;
  name: string;
  avatar: string | null;
  sports: string[];
  position: string | null;
  joinedAt: string;
}

export interface TeamDto {
  id: string;
  name: string;
  sport: string;
  logoUrl: string | null;
  createdAt: string;
  coach: { id: string; stringId: string; name: string; avatar: string | null };
  members: TeamMemberItem[];
}

export interface TeamSummaryDto {
  id: string;
  name: string;
  sport: string;
  logoUrl: string | null;
  memberCount: number;
  isCoach: boolean;
}

export interface CreateTeamDto {
  name: string;
  sport: string;
  logoUrl?: string;
}

export interface UserSearchResult {
  id: string;
  stringId: string;
  name: string;
  avatar: string | null;
  sports: string[];
  isContact: boolean;
}

@Injectable({ providedIn: 'root' })
export class TeamsService {
  private readonly http = inject(HttpClient);
  private readonly api  = environment.apiUrl;

  getMyTeams(): Observable<TeamSummaryDto[]> {
    return this.http.get<TeamSummaryDto[]>(`${this.api}/teams/mine`);
  }

  getTeamById(id: string): Observable<TeamDto> {
    return this.http.get<TeamDto>(`${this.api}/teams/${id}`);
  }

  createTeam(dto: CreateTeamDto): Observable<TeamDto> {
    return this.http.post<TeamDto>(`${this.api}/teams`, dto);
  }

  addMember(teamId: string, userId: string, position?: string): Observable<TeamMemberItem> {
    return this.http.post<TeamMemberItem>(`${this.api}/teams/${teamId}/members`, { userId, position });
  }

  removeMember(teamId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/teams/${teamId}/members/${userId}`);
  }

  searchUsers(q: string): Observable<UserSearchResult[]> {
    return this.http.get<UserSearchResult[]>(`${this.api}/contacts/search`, { params: { q } });
  }
}
