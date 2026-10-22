import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirebaseService } from './core/firebase/firebase.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  readonly firebase = inject(FirebaseService);

  async handleSignIn(): Promise<void> {
    try {
      await this.firebase.signInWithGoogle();
    } catch (err: unknown) {
      console.error('Sign-in failed:', err);
    }
  }

  async handleSignOut(): Promise<void> {
    try {
      await this.firebase.logout();
    } catch (err: unknown) {
      console.error('Sign-out failed:', err);
    }
  }
}
