import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TournamentTeamItem {
  registrationId: string;
  teamId: string;
  name: string;
  sport: string;
  logoUrl: string | null;
  memberCount: number;
  coach: { id: string; name: string; stringId: string };
  status: string;
  groupName: string | null;
  registeredAt: string;
}

export interface TournamentPublicDetail {
  id: string;
  name: string;
  sport: string;
  format: 'cup' | 'league' | 'groups_playoffs' | 'points';
  status: string;
  registrationOpen: boolean;
  requiresApproval: boolean;
  maxTeams: number | null;
  approvedTeamCount: number;
  startDate: string | null;
  endDate: string | null;
  organizer: { id: string; name: string };
  isOrganizer: boolean;
  approvedTeams: TournamentTeamItem[];
  pendingTeams: TournamentTeamItem[];
  createdAt: string;
}

export interface StandingRow {
  position: number;
  teamId: string;
  teamName: string;
  teamLogoUrl: string | null;
  groupName: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export interface MatchItem {
  id: string;
  tournamentId: string;
  round: string;
  bracketPosition: number | null;
  nextMatchId: string | null;
  homeTeam: { id: string; name: string; logoUrl: string | null } | null;
  awayTeam: { id: string; name: string; logoUrl: string | null } | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  status: string;
  eventId: string | null;
  playedAt: string | null;
  createdAt: string;
}

export interface BracketRound {
  name: string;
  matches: MatchItem[];
}

@Injectable({ providedIn: 'root' })
export class TournamentsService {
  private readonly http = inject(HttpClient);

  getPublicTournament(id: string): Observable<TournamentPublicDetail> {
    return this.http.get<TournamentPublicDetail>(`${environment.apiUrl}/tournaments/p/${id}`);
  }

  getMatches(id: string): Observable<MatchItem[]> {
    return this.http.get<MatchItem[]>(`${environment.apiUrl}/tournaments/${id}/matches`);
  }

  getStandings(id: string): Observable<StandingRow[]> {
    return this.http.get<StandingRow[]>(`${environment.apiUrl}/tournaments/${id}/standings`);
  }

  getBracket(id: string): Observable<BracketRound[]> {
    return this.http.get<BracketRound[]>(`${environment.apiUrl}/tournaments/${id}/bracket`);
  }
}
