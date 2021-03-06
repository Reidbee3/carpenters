import { Injectable, EventEmitter }    from '@angular/core';
import { Router } from '@angular/router';
import {
  writeFile,
  readFile,
  existsSync
} from 'fs';
import { relative, dirname } from 'path';
import { v4 } from 'uuid';

import { ActivityService } from './activity.service';
import { ArchivesSpaceService } from './archivesspace.service';
import { StandardItemService } from './standard-item.service';
import { LoggerService } from './logger.service';
import { ElectronService } from './electron.service';
import { WatchService } from './watch.service';

import { File } from 'app/classes/file';
import { Item } from 'app/classes/item';

@Injectable()
export class SaveService {

  saveLocation: string;
  selectedResource: any;
  startSave: number;

  saveStatus: EventEmitter<boolean> = new EventEmitter();
  saveChanged: EventEmitter<string> = new EventEmitter();
  projectChanged: EventEmitter<string> = new EventEmitter();

  constructor(
    private activity: ActivityService,
    private router: Router,
    private asService: ArchivesSpaceService,
    private standardItem: StandardItemService,
    private log: LoggerService,
    private electronService: ElectronService,
    private watch: WatchService) {
      this.asService.selectedResourceChanged.subscribe(resource => this.selectedResource = resource);
      this.watch.projectChanged.subscribe((filename) => {
        this.updateProject(filename);
      });
  }

  save(log: boolean = true): void {
    if (!this.saveLocation) {
      this.saveLocation = this.saveDialog();
      if (!this.saveLocation) {
        return;
      }
      this.projectChanged.emit(this.saveLocation);
    }

    this.startSave = this.now();
    console.log('Start save:', this.startSave);
    this.activity.start('save');
    let saveObject = this.createSaveObject();
    this.saveToFile(saveObject, this.saveLocation, log);
    this.saveChanged.emit(this.saveLocation);
  }

  open(location?: string): void {
    this.activity.start('open');
    if (location) {
      this.saveLocation = location;
    }
    else {
      this.saveLocation = this.openDialog();
    }
    if (!this.saveLocation) {
      this.activity.stop('open');
      return;
    }
    const startLoad = this.now()
    console.log('Loading Project: ', startLoad)
    this.asService.clear();
    this.standardItem.clear();
    readFile(this.saveLocation, 'utf8', (err, data) => {
      if (err) {
        this.activity.stop('open');
        this.log.error('Error opening file: ' + err.message);
        throw err;
      }

      let saveObject: any;
      try {
        saveObject = JSON.parse(data);
      }
      catch(err) {
        this.activity.stop('open');
        this.log.error('Unable to read file: ' + err.message);
        throw err;
      }

      this.loadObjects(saveObject);
      this.router.navigate([saveObject.type]);
      this.watch.projectFile(this.saveLocation);
      this.saveChanged.emit(this.saveLocation);
      this.projectChanged.emit(this.saveLocation);
      this.activity.stop('open');

      const loadTime = this.now() - startLoad;
      console.log(`Project load time: ${loadTime}ms`);
    });
    this.saveStatus.emit(true);
  }

  changesMade() {
    this.saveStatus.emit(false);
  }

  saveLocationBasePath(): string {
    return this.saveLocation.match(/.*[/\\]/).toString();
  }

  fromProjectFile(): boolean {
    return !(this.saveLocation === undefined || this.saveLocation === '');
  }

  private openDialog(): string {
    let filenames = this.electronService.dialog.showOpenDialog({
      title: 'Open Project...',
      filters: [
        { name: 'Carpenters File', extensions: ['carp'] }
      ],
      properties: [
        'openFile'
      ]
    });
    return (filenames) ? filenames[0] : '';
  }

  private saveDialog(): string {
    return this.electronService.dialog.showSaveDialog({
      title: 'Save...',
      filters: [
        { name: 'Carpenters File', extensions: ['carp'] }
      ]
    });
  }

  private createSaveStandardObject(): any {
    let resource = this.standardItem.getResource();
    let standardObjects = this.standardItem.items;

    let objects = [];
    for (let so of standardObjects) {
      let files: any[] = so.files.map((file) => {
        let path = relative(dirname(this.saveLocation), file.path);
        return { path: path, purpose: file.purpose }
      });
      objects.push({
        uuid: so.uuid,
        title: so.title,
        dates: [],
        containers: so.containers,
        level: so.level,
        productionNotes: so.productionNotes || '',
        pm_ark: so.pm_ark,
        do_ark: so.do_ark,
        files: files,
        metadata: so.metadata
      });
    }

    return ({
      type: 'standard',
      resource: resource,
      collectionTitle: resource.vocabTitle || resource.title || '',
      collectionArkUrl : resource.collectionArkUrl  || '',
      aic: resource.aic || '',
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
      if (ao.files === undefined) { ao.files = []; }

      const dates = ao.dates ? ao.dates.map(d => d.begin + (d.end ? '/' + d.end : '')) : '';

      let files = ao.files.map((value) => {
        let path = relative(dirname(this.saveLocation), value.path);
        return { path: path, purpose: value.purpose };
      });
      let object: any = {
        uuid: ao.uuid,
        title: ao.title,
        dates: dates,
        containers: ao.containers,
        uri: ao.record_uri,
        files: files,
        artificial: ao.artificial,
        productionNotes: this.getObjectProductionNotes(ao),
        pm_ark: ao.pm_ark,
        do_ark: ao.do_ark,
        metadata: ao.metadata || {}
      };
      if (ao.artificial) {
        object.parent_uri = ao.parent.record_uri;
        object.level = ao.level;
        object.containers = ao.containers;
      }
      objects.push(object);
    }

    return ({
      type: 'findingaid',
      resource: resource,
      collectionTitle: this.selectedResource.title || '',
      aic: this.selectedResource.aic || '',
      objects: objects
    });
  }

  private getObjectProductionNotes(o: any): string {
    if (o.productionNotes) {
      return o.productionNotes;
    }
    if (o.parent) {
      return this.getObjectProductionNotes(o.parent);
    }
    return '';
  }

  private saveToFile(object: any, filename: string, log: boolean = true): void {
    let dataString = '';
    try {
      dataString = JSON.stringify(object);
      if (dataString === '') {
        throw Error('Data appears to be empty');
      }
    }
    catch(err) {
      this.log.error('Error saving file: ' + err.message);
      return;
    }

    writeFile(filename, dataString, (err) => {
      this.saveStatus.emit(true);
      this.activity.stop('save');
      const saveTime = this.now() - this.startSave
      console.log(`Project save time: ${saveTime}ms`)
      if (err) {
        this.log.error('Error saving file: ' + err.message);
      }
      else if(log) {
        this.log.success('Saved file: ' + this.saveLocation, false);
      }
    });
  }

  private loadObjects(obj: any): void {
    if (obj.type === 'findingaid') {
      this.asService.getResource(obj.resource)
        .then((resource) => {
          this.selectedResource.aic = obj.aic || '';
          this.markSelections(obj.objects, this.selectedResource.tree.children);
          this.asService.selectedArchivalObjects();
          this.log.success('Using AIC: ' + this.selectedResource.aic, false);
          this.log.success('Loaded file: ' + this.saveLocation, false);
        });
    }
    else {
      this.loadStandardObjects(obj);
    }
  }

  private loadStandardObjects(obj: any): void {
    this.standardItem.setResourceTitle(obj.collectionArkUrl ||
      obj.collectionTitle || obj.resource.title);
    this.standardItem.setResourceAic(obj.aic);
    for (let o of obj.objects) {
      let item: Item = o;
      if (!this.itemExists(item, this.standardItem.items)) {
        const container = this.convertFromASContainer(item.containers[0])
        
        item.uuid = o.uuid || v4();
        item.files = this.convertToFileObjects(o.files);
        item.selected = true;
        item.productionNotes = o.productionNotes;
        item.pm_ark = o.pm_ark;
        item.do_ark = o.do_ark;
        item.metadata = o.metadata;
        this.standardItem.push(item);
      }
    }
    this.log.success('Using AIC: ' + (obj.aic || ''), false);
    this.log.success('Loaded file: ' + this.saveLocation, false);
  }

  private markSelections(selections: any, children: any): void {
    for (let c of children) {
      let found = selections.find((e) => {
        return e.uri === c.record_uri && !e.artificial;
      });
      if (found) {
        const container = this.convertFromASContainer(found.containers[0])

        c.uuid = found.uuid || v4();
        c.selected = true;
        c.containers = found.containers || [];
        c.productionNotes = found.productionNotes || '';
        c.pm_ark = found.pm_ark;
        c.do_ark = found.do_ark;
        c.metadata = found.metadata || {};
        c.files = this.convertToFileObjects(found.files);
      }

      let artificial = selections.filter(function(e) {
        return e.artificial && e.parent_uri === c.record_uri;
      });
      if (artificial.length > 0) {
        artificial = artificial.map((value) => {
          value.uuid = value.uuid || v4();
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
      let path = value.path;
      value.path = dirname(this.saveLocation) + '/' + value.path;
      if (!existsSync(value.path)) {
        /* Backwards compatibility */
        value.path = path;
        if (!existsSync(value.path)) {
          /* Don't need this anymore since we are updating the files through
             the Files hierarchy on the filesystem */
          // this.log.error('File does not exist: ' + value.path);
          return null;
        }
      }
      let file = new File(value.path);
      file.setPurpose(value.purpose);
      return file;
    });

    return mapFiles.filter((value) => {
      return value !== null;
    });
  }

  private updateProject(filename: string): void {
    readFile(this.saveLocation, 'utf8', (err, data) => {
      if (err) {
        this.log.error(err.message);
        console.error(err);
      }
      let projectData = JSON.parse(data);
      if (projectData.type === 'findingaid') {
        this.updateObjects(projectData, filename);
      }
      else {
        this.updateStandardObjects(projectData, filename);
      }
    });
  }

  private updateObjects(data:any, filename: string): void {
    for (let pObject of data.objects) {
      let object = this.findObjectByUuid(this.selectedResource.tree.children, pObject.uuid);
      if (object) {
        object.metadata = pObject.metadata;
        object.productionNotes = pObject.productionNotes;
        object.do_ark = pObject.do_ark || '';
      }
    }
  }

  private updateStandardObjects(data: any, filename: string): void {
    let items = this.standardItem.getAll();
    for (let pObject of data.objects) {
      let object = items.find(s => s.uuid === pObject.uuid);
      if (object) {
        object.metadata = pObject.metadata;
        object.productionNotes = pObject.productionNotes;
        object.do_ark = pObject.do_ark || '';
      }
    }
  }

  private findObjectByUuid(children: any[], uuid: string): any {
    if (!children) {
      return null;
    }

    for( let child of children) {
      let found = this.findObjectByUuid(child.children, uuid);
      if (found) {
        return found;
      }
      if (child.uuid === uuid) {
        return child;
      }
    }

    return null;
  }

  private itemExists(item: Item, items: any) {
    let tmp = items.filter(i => i.uuid === item.uuid);
    return tmp.length > 0;
  }

  private now() {
    const date = new Date();
    return date.getTime();
  }

  private convertFromASContainer(container: any): any {
    let rContainer = [];
    for (let i = 1; i <= 3; i++) {
      rContainer.push({
        type: container['type_' + i],
        indicator: container['indicator_' + i]
      });
    }
    return rContainer;
  }

  private containerToPath(container: any): string {
    let returnString = '';
    let newContainer = container.filter((value) => {
      return value.type && value.type !== null;
    });
    for (let c of newContainer) {
      returnString += c.type + '_' + this.padLeft(c.indicator, 3, '0') + '/';
    }
    return returnString;
  }

  private padLeft(value: any, length: number, character: string): string {
    value = String(value);
    if (value.length > length) { return value; }
    return Array(length - value.length + 1).join(character || " ") + value;
  }

}
