import { Injectable, Output, EventEmitter }    from '@angular/core';
import { Router } from '@angular/router';

import { remote } from 'electron';
import { writeFile } from 'fs';
import { readFile } from 'fs';
import { existsSync } from 'fs';

import { ArchivesSpaceService } from './archivesspace.service';
import { StandardItemService } from './standard-item.service';
import { LoggerService } from './logger.service';

import { File } from './file';
import { Item } from './item';

let { dialog } = remote;

@Injectable()
export class SaveService {

  saveLocation: string;
  selectedResource: any;

  @Output() saveStatus: EventEmitter<boolean> = new EventEmitter();

  constructor(
    private router: Router,
    private asService: ArchivesSpaceService,
    private standardItem: StandardItemService,
    private log: LoggerService) {
    this.asService.selectedResourceChanged.subscribe(resource => this.selectedResource = resource);
  }

  save(): void {
    if (!this.saveLocation) {
      this.saveLocation = this.saveDialog();
      if (!this.saveLocation) {
        return;
      }
    }

    let saveObject = this.createSaveObject();
    this.saveToFile(saveObject, this.saveLocation);
    this.saveStatus.emit(true);
    this.log.success('Saved file: ' + this.saveLocation, false);
  }

  open(): void {
    this.saveLocation = this.openDialog();
    if (!this.saveLocation) {
      return;
    }
    this.asService.clear();
    this.standardItem.clear();
    readFile(this.saveLocation, 'utf8', (err, data) => {
      if (err) {
        this.log.error('Error opening file: ' + err.message);
        throw err;
      }
      let saveObject = JSON.parse(data);
      this.loadObjects(saveObject);
      this.router.navigate([saveObject.type]);
    });
    this.saveStatus.emit(true);
  }

  changesMade() {
    this.saveStatus.emit(false);
  }

  saveLocationBasePath(): string {
    return this.saveLocation.match(/.*[/\\]/).toString();
  }

  private openDialog(): string {
    let filenames = dialog.showOpenDialog({
      title: 'Open Project...',
      filters: [
        { name: 'Carpetners File', extensions: ['carp'] }
      ],
      properties: [
        'openFile'
      ]
    });
    return (filenames) ? filenames[0] : '';
  }

  private saveDialog(): string {
    return dialog.showSaveDialog({
      title: 'Save...',
      filters: [
        { name: 'Carpenters File', extensions: ['carp'] }
      ]
    });
  }

  private createSaveStandardObject(): any {
    let resource = this.standardItem.getResource();
    let standardObjects = this.standardItem.getAll();

    let objects = [];
    for (let so of standardObjects) {
      let files: any[] = so.files.map((file) => {
        return { path: file.path, purpose: file.purpose }
      });
      objects.push({
        title: so.title,
        containers: so.containers,
        level: so.level,
        files: files
      });
    }

    return ({
      type: 'standard',
      resource: resource,
      sip_ark: resource.sip_ark || '',
      objects: objects
    });
  }

  private createSaveObject(): any {
    if(this.selectedResource === undefined) {
      return this.createSaveStandardObject();
    }

    let resource = this.selectedResource.uri;
    let archivalObjects = this.asService.selectedArchivalObjects();
    let objects = [];
    for (let ao of archivalObjects) {
      let files = ao.files.map((value) => {
        return { path: value.path, purpose: value.purpose };
      });
      let object: any = {
        uri: ao.record_uri,
        files: files,
        artificial: ao.artificial
      };
      if (ao.artificial) {
        object.title = ao.title;
        object.parent_uri = ao.parent.record_uri;
        object.level = ao.level;
        object.containers = ao.containers;
      }
      objects.push(object);
    }

    return ({
      type: 'findingaid',
      resource: resource,
      sip_ark: this.selectedResource.sip_ark || '',
      objects: objects
    });
  }

  private saveToFile(object: any, filename: string): void {
    let dataString = JSON.stringify(object);
    writeFile(filename, dataString), (err) => {
      if (err) {
        dialog.showErrorBox('Error saving file', err.message);
      }
    }
  }

  private loadObjects(obj: any): void {
    if (obj.type === 'findingaid') {
      this.asService.getResource(obj.resource)
        .then((resource) => {
          this.selectedResource.sip_ark = obj.sip_ark || '';
          this.markSelections(obj.objects, this.selectedResource.tree.children);
          if (this.selectedResource.sip_ark !== '') {
            this.log.success('SIP Ark: ' + this.selectedResource.sip_ark, false);
          }
          this.log.success('Loaded file: ' + this.saveLocation, false);
        });
    }
    else {
      this.loadStandardObjects(obj);
    }
  }

  private loadStandardObjects(obj: any): void {
    this.standardItem.setResourceTitle(obj.resource.title);
    this.standardItem.setResourceSipArk(obj.sip_ark);
    for (let o of obj.objects) {
      let item: Item = o;
      item.files = this.convertToFileObjects(o.files);
      item.selected = true;
      this.standardItem.push(item);
    }
    if (obj.sip_ark !== '') {
      this.log.success('SIP Ark: ' + obj.sip_ark, false);
    }
    this.log.success('Loaded file: ' + this.saveLocation, false);
  }

  private markSelections(selections: any, children: any): void {
    for (let c of children) {
      let found = selections.find((e) => {
        return e.uri === c.record_uri && !e.artificial;
      });
      if (found) {
        c.selected = true;
        c.files = this.convertToFileObjects(found.files);
      }

      let artificial = selections.filter(function(e) {
        return e.artificial && e.parent_uri === c.record_uri;
      });
      if (artificial.length > 0) {
        artificial = artificial.map((value) => {
          value.files = this.convertToFileObjects(value.files);
          value.selected = true;
          value.record_uri = undefined;
          value.children = [];
          value.parent = c;
          return value;
        });
        c.children = c.children.concat(artificial);
      }

      this.markSelections(selections, c.children);
    }
  }

  private convertToFileObjects(files: any[]): File[] {
    let mapFiles =  files.map((value) => {
      if (!existsSync(value.path)) {
        this.log.error('File does not exist: ' + value.path);
        return null;
      }
      let file = new File(value.path);
      file.setPurpose(value.purpose);
      return file;
    });

    return mapFiles.filter((value) => {
      return value !== null;
    });
  }

}