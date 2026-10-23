import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { NotificationToast } from '../../shared/components/notification-toast/notification-toast';

@Component({
  selector: 'app-shell',
  imports: [Navbar, RouterOutlet, NotificationToast],
  templateUrl: './shell.html',
  styleUrl: './shell.scss'
})
export class Shell {}
