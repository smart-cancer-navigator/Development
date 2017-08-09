/**
 * Wrapper class of tabs for a bunch of post- data-entry components (Clinical Trials, etc.)
 */

import { Component, OnInit } from '@angular/core';
import { Variant } from '../global/genomic-data';
import { USER_SELECTED_VARIANTS } from '../data-entry/data-entry.component';
import { SMARTClient } from '../smart-initialization/smart-reference.service';

@Component({
  selector: 'visualize-results',
  template: `
    <h2 class="display-2">Results</h2>
    <ngb-accordion #acc="ngbAccordion">
      <ngb-panel *ngFor="let variant of variants; let i = index;" title="{{variant.optionName()}}">
        <ng-template ngbPanelContent>
          <ngb-tabset [destroyOnHide]="false" >
            <ngb-tab title="Gene">
              <ng-template ngbTabContent>
                
                <br>
                <h3 class="display-3">
                  {{variant.origin.hugo_symbol}}
                  <small class="text-muted">{{variant.origin.name}}</small>
                </h3>
                
                <!-- A bit of info about the variant/gene -->
                <table class="table table-bordered table-striped">
                  <thead>
                  </thead>
                  <tbody>
                  <tr>
                    <td>Score</td>
                    <td ngbPopover="Gene Score defines Pathogenicity." triggers="mouseenter:mouseleave">{{variant.origin.score}}</td>
                  </tr>
                  </tbody>
                </table>
              </ng-template>
            </ngb-tab>
            
            <ngb-tab title="Variant">
              <ng-template ngbTabContent>
                
                <br>
                <h3 class="display-3">{{variant.variant_name}}</h3>
                
                <!-- A bit of info about the variant/gene -->
                <table class="table table-bordered table-striped">
                  <thead>
                  </thead>
                  <tbody>
                  <tr *ngIf="variant.description && variant.description !== ''">
                    <td>Description</td>
                    <td>{{variant.description}}</td>
                  </tr>
                  <tr>
                    <td>Score</td>
                    <td ngbPopover="Variant Score often defines Pathogenicity." triggers="mouseenter:mouseleave">{{variant.score}}</td>
                  </tr>
                  <tr>
                    <td>Variant Origin</td>
                    <td>{{variant.somatic ? 'Somatic' : 'Germline'}}</td>
                  </tr>
                  <tr *ngIf="variant.types.length > 0">
                    <td>Variant Type</td>
                    <td >{{variant.types.join(', ')}}</td>
                  </tr>
                  <tr *ngIf="variant.drugs.length > 0">
                    <td>Effective Drugs</td>
                    <td>{{variant.drugs.join(', ')}}</td>
                  </tr>
                  <tr  *ngIf="variant.diseases.length > 0" >
                    <td>Known Diseases</td>
                    <td>{{variant.diseases.join(', ')}}</td>
                  </tr>
                  <tr>
                    <td>Variant Location</td>
                    <td>Chromosome {{variant.getLocation()}}</td>
                  </tr>
                  </tbody>
                </table>
              </ng-template>
            </ngb-tab>

            <ngb-tab title="Clinical Trials">
              <ng-template ngbTabContent>
                <clinical-trials [forVariant]="variant"></clinical-trials>
              </ng-template>
            </ngb-tab>
          </ngb-tabset>
        </ng-template>
      </ngb-panel>
    </ngb-accordion>
    
    <button type="button" class="btn btn-success" style="float: right" (click)="saveVariantsToFHIRPatient()">Submit Data to EHR</button>
  `,
  styles: [`    
    small {
      font-size: 25px;
    }
  `]
})
export class VisualizeResultsComponent implements OnInit {
  variants: Variant[];

  ngOnInit() {
    this.variants = USER_SELECTED_VARIANTS;
  }

  saveVariantsToFHIRPatient() {
    if (!(this.variants && this.variants.length > 0)) {
      console.log('Can\'t save an empty array of variants :P');
      return;
    }

    SMARTClient.subscribe(smartClient => {
      smartClient.patient.read().then((p) => {
        for (const variant of this.variants) {
          const dataToTransmit = {
            'resource': {
              'resourceType': 'Observation',
              'id': 'SMART-Observation-' + p.identifier[0].value + '-variation-' + variant.hgvs_id.replace(/[.,\/#!$%\^&\*;:{}<>=\-_`~()]/g, ''),
              'meta': {
                'versionId': '1' // ,
                // 'lastUpdated': Date.now().toString()
              },
              'text': {
                'status': 'generated',
                'div': '<div xmlns=\'http://www.w3.org/1999/xhtml\'>Variation at ' + variant.getLocation() + '</div>'
              },
              'status': 'final',
              'category': [
                {
                  'coding': [
                    {
                      'system': 'http://hl7.org/fhir/observation-category',
                      'code': 'genomic-variant',
                      'display': 'Genomic Variant'
                    }
                  ],
                  'text': 'Genomic Variant'
                }
              ],
              'code': {
                'coding': [
                  {
                    'system': 'http://www.hgvs.org',
                    'code': variant.hgvs_id,
                    'display': variant.hgvs_id
                  }
                ],
                'text': variant.hgvs_id
              },
              'subject': {
                'reference': 'Patient/' + p.id
              },
              // 'effectiveDateTime': Date.now().toString(),
              // 'valueQuantity': {
              //   'value': 41.1,
              //   'unit': 'weeks',
              //   'system': 'http://unitsofmeasure.org',
              //   'code': 'wk'
              // },
              // 'context': {}
            }
          };

          console.log('Updating data with ', dataToTransmit);
          smartClient.api.update(dataToTransmit)
            .then(result => {
              console.log('Success:', result);
            })
            .fail(err => {
              console.log('Error:', err);
            });
        }
      });
    });
  }
}
