import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  status: 'scheduled' | 'played' | 'cancelled' | 'postponed';
  eventId: string | null;
  playedAt: string | null;
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

export interface BracketRound {
  name: string;
  matches: MatchItem[];
}

export interface ScheduleMatchDto {
  startDatetime: string;
  locationName: string;
}

export interface RecordResultDto {
  homeScore: number;
  awayScore: number;
  homePenalties?: number;
  awayPenalties?: number;
}

@Injectable({ providedIn: 'root' })
export class FixturesService {
  private readonly http = inject(HttpClient);
  private readonly api  = environment.apiUrl;

  generateFixture(tournamentId: string): Observable<MatchItem[]> {
    return this.http.post<MatchItem[]>(`${this.api}/tournaments/${tournamentId}/fixture`, {});
  }

  getMatches(tournamentId: string): Observable<MatchItem[]> {
    return this.http.get<MatchItem[]>(`${this.api}/tournaments/${tournamentId}/matches`);
  }

  getStandings(tournamentId: string): Observable<StandingRow[]> {
    return this.http.get<StandingRow[]>(`${this.api}/tournaments/${tournamentId}/standings`);
  }

  getBracket(tournamentId: string): Observable<BracketRound[]> {
    return this.http.get<BracketRound[]>(`${this.api}/tournaments/${tournamentId}/bracket`);
  }

  scheduleMatch(tournamentId: string, matchId: string, dto: ScheduleMatchDto): Observable<MatchItem> {
    return this.http.patch<MatchItem>(
      `${this.api}/tournaments/${tournamentId}/matches/${matchId}/schedule`, dto,
    );
  }

  recordResult(tournamentId: string, matchId: string, dto: RecordResultDto): Observable<MatchItem> {
    return this.http.patch<MatchItem>(
      `${this.api}/tournaments/${tournamentId}/matches/${matchId}/result`, dto,
    );
  }
}
