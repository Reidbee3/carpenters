import 'zone.js/dist/zone-mix';
import 'reflect-metadata';
import 'polyfills';
import { BrowserModule, Title } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

/* Components */
import { ActivityComponent } from './components/activity/activity.component';
import { AppComponent } from './app.component';
import { ArchivesSpaceComponent } from './components/archivesspace/archivesspace.component';
import { ArkEditorComponent } from './components/ark-editor/ark-editor.component';
import { FileListComponent } from './components/file-view/file-list.component';
import { FileViewComponent } from './components/file-view/file-view.component';
import { ItemViewComponent } from './components/item-view/item-view.component';
import { LoggerComponent } from './components/logger/logger.component';
import { NotificationComponent } from './components/notification/notification.component';
import { ObjectListComponent } from './components/file-view/object-list.component';
import { PromptComponent } from './components/prompt/prompt.component';
import { ResizeComponent } from './components/file-view/resize';
import { StandardComponent } from './components/standard/standard.component';
import { TreeViewComponent } from './components/tree-view/tree-view.component';

/* Modules */
import { AppRoutingModule } from './app-routing.module';

/* Directives */
import { FileDraggable } from './directives/file-draggable.directive';

/* Services */
import { ActivityService } from './services/activity.service';
import { ArchivalItemService } from './services/archival-item-service';
import { ArchivesSpaceService } from './services/archivesspace.service';
import { CsvService } from './services/csv.service';
import { DecisionService } from './services/decision.service';
import { ElectronService } from './services/electron.service';
import { ExportService } from './services/export.service';
import { FilesService } from './services/files.service';
import { GreensService } from './services/greens.service';
import { LocalStorageService } from './services/local-storage.service';
import { LoggerService } from './services/logger.service';
import { MapService } from './services/map.service';
import { ModifiedMasterService } from './services/modified-master.service';
import { ObjectService } from './services/object.service';
import { PreferencesService } from './services/preferences.service';
import { ProductionNotesService } from './services/production-notes.service';
import { ProgressBarService } from './services/progress-bar.service';
import { SaveService } from './services/save.service';
import { SessionStorageService } from './services/session-storage.service';
import { ShotListService } from './services/shot-list.service';
import { SipService } from './services/sip.service';
import { StandardItemService } from './services/standard-item.service';
import { WatchService } from './services/watch.service';

/* Pipes */
import { FilePurposeFilterPipe } from './pipes/file-purpose-filter.pipe';


@NgModule({
  declarations: [
    ActivityComponent,
    AppComponent,
    ArchivesSpaceComponent,
    ArkEditorComponent,
    FileListComponent,
    FileViewComponent,
    ItemViewComponent,
    LoggerComponent,
    NotificationComponent,
    ObjectListComponent,
    PromptComponent,
    ResizeComponent,
    StandardComponent,
    TreeViewComponent,

    FileDraggable,

    FilePurposeFilterPipe
  ],
  imports: [
    AppRoutingModule,
    BrowserModule,
    FormsModule,
    HttpModule,
    NgbModule.forRoot()
  ],
  providers: [
    ActivityService,
    ArchivalItemService,
    ArchivesSpaceService,
    CsvService,
    DecisionService,
    ElectronService,
    ExportService,
    FilesService,
    GreensService,
    LocalStorageService,
    LoggerService,
    MapService,
    ModifiedMasterService,
    ObjectService,
    PreferencesService,
    ProductionNotesService,
    ProgressBarService,
    SaveService,
    SessionStorageService,
    SipService,
    ShotListService,
    StandardItemService,
    WatchService
  ],
  entryComponents: [
    PromptComponent
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
