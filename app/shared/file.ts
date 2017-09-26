import { getType } from 'mime';
import { statSync } from 'fs';

export class File {
  name: string;
  path: string;
  lastModified: number;
  lastModifiedDate: Date;
  size: number;
  type: string;
  purpose: string;

  constructor(path: string) {
    this.name = this.basename(path);
    this.path = path;

    try {
      let stats = statSync(this.path);
      this.size = stats.size;
      this.lastModified = stats.mtime.getTime();
      this.lastModifiedDate = stats.mtime;
    } catch(e) {
      console.error(e.message);
    }
    this.type = getType(this.path);
    this.purpose = this.setPurpose();
  }

  setPurpose(purpose?: string): string {
    if (purpose) {
      this.purpose = purpose;
      return;
    }

    let match = this.name.match(/_[a-z]{2}\./i);
    if (match) {
      if (match[0] === '_pm.') {
        return 'preservation';
      }
      if (match[0] === '_mm.') {
        return 'modified-master';
      }
    }
    return 'access-copy';
  }

  basename(path: string): string {
    return path.split(/[\\/]/).pop();
  }
}
