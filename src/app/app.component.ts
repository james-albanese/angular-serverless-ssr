import { Component, OnInit, PLATFORM_ID, inject } from "@angular/core";
import { CommonModule, isPlatformServer } from "@angular/common";
import { RouterOutlet } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { Observable, take } from "rxjs";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet
  ],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss"
})

export class AppComponent implements OnInit {

  title = "angular-serverless-ssr";

  public todos$: Observable<any> = this.httpClient.get("https://jsonplaceholder.typicode.com/todos");

  private _platformId: Object = inject(PLATFORM_ID);
  private _isServer: boolean = isPlatformServer(this._platformId);

  constructor(private httpClient: HttpClient) { }

  ngOnInit(): void {
    if (this._isServer) {
      console.log("Hello from the server!");
    } else {
      console.log("Hello from the browser!");
    }
    this._loadTodos();
  }

  private _loadTodos(): void {
    this.todos$.pipe(take(1)).subscribe({
      next: (todos) => console.log(todos)
    })
  }

}