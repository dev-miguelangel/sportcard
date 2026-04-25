import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type TournamentFormat = 'cup' | 'league' | 'groups_playoffs' | 'points';
export type TournamentStatus = 'draft' | 'open' | 'in_progress' | 'finished';
export type RegistrationStatus = 'pending' | 'approved' | 'rejected';

export interface TournamentTeamItem {
  registrationId: string;
  teamId: string;
  name: string;
  sport: string;
  logoUrl: string | null;
  memberCount: number;
  coach: { id: string; name: string; stringId: string };
  status: RegistrationStatus;
  groupName: string | null;
  registeredAt: string;
}

export interface TournamentSummaryDto {
  id: string;
  name: string;
  sport: string;
  format: TournamentFormat;
  status: TournamentStatus;
  registrationOpen: boolean;
  requiresApproval: boolean;
  maxTeams: number | null;
  approvedTeamCount: number;
  startDate: string | null;
  endDate: string | null;
  organizer: { id: string; name: string };
  isOrganizer: boolean;
}

export interface PublicTournamentDto extends TournamentSummaryDto {
  shareToken: string;
}

export interface PublicEventDto {
  id: string;
  title: string;
  sport: string;
  type: string;
  startDatetime: string;
  locationName: string;
  maxParticipants: number | null;
  participantCount: number;
  isPublic: boolean;
  shareToken: string;
}

export interface TournamentDetailDto extends TournamentSummaryDto {
  shareToken: string;
  approvedTeams: TournamentTeamItem[];
  pendingTeams: TournamentTeamItem[];
  createdAt: string;
}

export interface TournamentPublicDto {
  id: string;
  name: string;
  sport: string;
  format: TournamentFormat;
  status: TournamentStatus;
  registrationOpen: boolean;
  maxTeams: number | null;
  approvedTeamCount: number;
  startDate: string | null;
  endDate: string | null;
}

export interface CreateTournamentDto {
  name: string;
  sport: string;
  format: TournamentFormat;
  maxTeams?: number;
  registrationOpen?: boolean;
  requiresApproval?: boolean;
  startDate?: string;
  endDate?: string;
}

@Injectable({ providedIn: 'root' })
export class TournamentsService {
  private readonly http = inject(HttpClient);
  private readonly api  = environment.apiUrl;

  listPublic(): Observable<PublicTournamentDto[]> {
    return this.http.get<PublicTournamentDto[]>(`${this.api}/tournaments/t`);
  }

  listPublicEvents(): Observable<PublicEventDto[]> {
    return this.http.get<PublicEventDto[]>(`${this.api}/events/token`);
  }

  getAll(): Observable<TournamentSummaryDto[]> {
    return this.http.get<TournamentSummaryDto[]>(`${this.api}/tournaments`);
  }

  getMine(): Observable<TournamentSummaryDto[]> {
    return this.http.get<TournamentSummaryDto[]>(`${this.api}/tournaments/mine`);
  }

  getById(id: string): Observable<TournamentDetailDto> {
    return this.http.get<TournamentDetailDto>(`${this.api}/tournaments/${id}`);
  }

  getByToken(shareToken: string): Observable<TournamentPublicDto> {
    return this.http.get<TournamentPublicDto>(`${this.api}/tournaments/t/${shareToken}`);
  }

  create(dto: CreateTournamentDto): Observable<TournamentDetailDto> {
    return this.http.post<TournamentDetailDto>(`${this.api}/tournaments`, dto);
  }

  registerTeam(tournamentId: string, teamId: string): Observable<TournamentTeamItem> {
    return this.http.post<TournamentTeamItem>(`${this.api}/tournaments/${tournamentId}/teams`, { teamId });
  }

  updateRegistration(tournamentId: string, teamId: string, status: RegistrationStatus): Observable<TournamentTeamItem> {
    return this.http.patch<TournamentTeamItem>(`${this.api}/tournaments/${tournamentId}/teams/${teamId}`, { status });
  }

  updateStatus(tournamentId: string, status: TournamentStatus): Observable<TournamentDetailDto> {
    return this.http.patch<TournamentDetailDto>(`${this.api}/tournaments/${tournamentId}/status`, { status });
  }
}
