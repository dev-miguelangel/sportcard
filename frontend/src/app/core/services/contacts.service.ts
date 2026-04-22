import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ContactUser {
  id: string;
  stringId: string;
  name: string;
  avatar: string | null;
  sports: string[];
  isContact: boolean;
}

@Injectable({ providedIn: 'root' })
export class ContactsService {
  private readonly http = inject(HttpClient);

  search(q: string): Observable<ContactUser[]> {
    return this.http.get<ContactUser[]>(`${environment.apiUrl}/contacts/search`, {
      params: { q },
    });
  }

  getContacts(): Observable<ContactUser[]> {
    return this.http.get<ContactUser[]>(`${environment.apiUrl}/contacts`);
  }

  addContact(userId: string): Observable<ContactUser> {
    return this.http.post<ContactUser>(`${environment.apiUrl}/contacts/${userId}`, {});
  }

  removeContact(userId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/contacts/${userId}`);
  }
}
