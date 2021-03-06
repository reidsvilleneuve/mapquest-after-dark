import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Http, Response } from '@angular/http';
import { MdDialog, MdSnackBar, MdSnackBarRef } from '@angular/material';
import { ActivatedRoute, ParamMap } from '@angular/router';

import { Store } from '@ngrx/store';
import { go } from '@ngrx/router-store';

import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';

import * as exploreSelectors from '../../state/explore/selectors';
import * as geolocationSelectors from '../../state/geolocation/selectors';
import { SetMapExtentAction, ShowPoiDetailsAction } from '../../state/explore/actions';
import { PoiDetails } from '../../state/explore/state';
import { State } from '../../state/state';

import { LayerDialogComponent } from '../layer-dialog/layer-dialog.component';
import { MapMarkerElementFactoryService } from '../map-marker-element-factory.service';
import { PoiDetailsSnackBarComponent } from '../poi-details-snack-bar/poi-details-snack-bar.component';

@Component({
  selector: 'mad-explore-container',
  templateUrl: './explore-container.component.html',
  styleUrls: ['./explore-container.component.scss']
})
export class ExploreContainerComponent implements OnDestroy, OnInit {

  @ViewChild('map') mapEl: ElementRef;

  geolocationMarker: ElementRef;
  geolocationPositionLngLat: Observable<mapboxgl.LngLat>;
  layerButtons = [];
  layerData: Observable<any>;
  layerFilter: Observable<any>;
  mapCenter: Observable<mapboxgl.LngLat>;
  mapZoom: Observable<number>;
  snackBarRef: MdSnackBarRef<any>;

  layerButtonsSubscription: Subscription;
  routeParamsSubscription: Subscription;
  showPoiDetailsSubscription: Subscription;

  constructor(
    private http: Http,
    private dialog: MdDialog,
    private snackBar: MdSnackBar,
    private markerElementFactory: MapMarkerElementFactoryService,
    private route: ActivatedRoute,
    private store: Store<State>
  ) { }

  ngOnInit() {
    this.geolocationMarker = this.markerElementFactory.createGeolocationMarker();

    this.layerData = this.http.get('/assets/data/features.geojson')
      .map((response: Response) => response.json());

    this.geolocationPositionLngLat = this.store.select(geolocationSelectors.lastPositionLngLat)
      .filter((lngLat: mapboxgl.LngLat) => lngLat !== null);
    this.layerFilter = this.store.select(exploreSelectors.layersEnabledFilter);
    this.mapCenter = this.store.select(exploreSelectors.mapCenter);
    this.mapZoom = this.store.select(exploreSelectors.mapZoom);

    this.layerButtonsSubscription = this.store.select(exploreSelectors.layerButtons)
      .subscribe(layerButtons => this.layerButtons = layerButtons);

    this.showPoiDetailsSubscription = this.store.select(exploreSelectors.selectedEntityWithShowPoiDetails)
      .subscribe(state => {
        if (this.snackBarRef) {
          this.snackBarRef.dismiss();
        }

        if (state.showPoiDetails && state.entity) {
          this.snackBarRef = this.snackBar.openFromComponent(PoiDetailsSnackBarComponent, { extraClasses: ['mad-explore-snack-bar'] });
          this.snackBarRef.instance.snackBarRef = this.snackBarRef;
          this.snackBarRef.instance.name = state.entity.name;
        }
      });

    this.routeParamsSubscription = this.route.paramMap
      .filter((params: ParamMap) => params.get('x') !== null && params.get('y') !== null && params.get('z') !== null)
      .map((params: ParamMap) =>
        ({
          center: { lng: parseFloat(params.get('x')), lat: parseFloat(params.get('y')) } as mapboxgl.LngLat,
          zoom: parseFloat(params.get('z'))
        }))
      .subscribe((extent) => this.store.dispatch(new SetMapExtentAction(extent)));
  }

  ngOnDestroy() {
    if (this.snackBarRef) {
      this.snackBarRef.dismiss();
    }

    this.layerButtonsSubscription.unsubscribe();
    this.routeParamsSubscription.unsubscribe();
    this.showPoiDetailsSubscription.unsubscribe();
  }

  onMapClick($event) {
    if ($event.lngLat) {
      const map = $event.target as mapboxgl.Map;
      const features = map.queryRenderedFeatures($event.point);
      if (features.length) {
        const feature = features[0];
        try {
          const properties = feature.properties as any;
          const name = JSON.parse(properties.name).value;
          this.store.dispatch(new ShowPoiDetailsAction({ name } as PoiDetails));
        } catch (e) {
          console.warn('could not handle feature:', e.stack);
        }
      }
    }
  }

  onMapMoveend($event) {
    const center = $event.target.getCenter();
    const zoom = $event.target.getZoom();
    this.store.dispatch(go(['/explore', { x: center.lng, y: center.lat, z: zoom }]));
  }

  openLayersDialog() {
    this.dialog.open(LayerDialogComponent, { data: { layerButtons: this.layerButtons } });
  }

}
