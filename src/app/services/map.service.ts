import { Injectable }    from '@angular/core';
import { Headers, Http } from '@angular/http';

import 'rxjs/add/operator/toPromise';

import { MapField } from 'app/classes/map-field';

@Injectable()
export class MapService {
  mapFields: MapField[];

  constructor(private http: Http) { }

  getMapFields(url: string): Promise<MapField[]> {
    return this.http.get(url)
      .toPromise()
      .then(response => this.mapFields = response.json() as MapField[])
      .catch((error) => {
        return this.handleError(error);
      });
  }

  getMapFieldByFullName(name: string): MapField {
    return this.mapFields.find(field => name === (field.namespace + '.' + field.name));
  }

  getMapFieldsAsList(): string[] {
    return this.mapFields.map(field => field.namespace + '.' + field.name);
  }

  private handleError(error: any): Promise<any> {
    return Promise.reject(error.message || error);
  }

}
