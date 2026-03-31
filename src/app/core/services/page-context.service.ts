import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { PageId } from '../models/page-id.enum';

@Injectable({
  providedIn: 'root'
})
export class PageContextService {
  private titleService = inject(Title);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);

  private readonly SYSTEM_PREFIX = 'SmartMoney';
  private readonly DEFAULT_TITLE = 'Sistema';

  constructor() {
    this.init();
  }

  private init(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.getDeepestRoute(this.activatedRoute))
    ).subscribe(route => {
      const data = route.snapshot.data;
      const title = data['title'];
      const pageId = data['pageId'] as PageId;

      this.updateBrowserTitle(title);
      this.updateBodyDataPage(pageId);
    });
  }

  /**
   * Traverse the route tree to find the active leaf route.
   */
  private getDeepestRoute(route: ActivatedRoute): ActivatedRoute {
    let active = route;
    while (active.firstChild) {
      active = active.firstChild;
    }
    return active;
  }

  /**
   * Updated browser tab title with a standard prefix.
   */
  private updateBrowserTitle(title?: string): void {
    const finalTitle = title ? `${this.SYSTEM_PREFIX} - ${title}` : `${this.SYSTEM_PREFIX} - ${this.DEFAULT_TITLE}`;
    this.titleService.setTitle(finalTitle);
  }

  /**
   * Updated body 'data-page' attribute for global identification.
   */
  private updateBodyDataPage(pageId?: PageId): void {
    if (typeof document === 'undefined') return;

    if (pageId) {
      document.body.setAttribute('data-page', String(pageId));
    } else {
      document.body.removeAttribute('data-page');
    }
  }
}
