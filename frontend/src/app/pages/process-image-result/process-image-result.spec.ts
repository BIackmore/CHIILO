import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcessImageResult } from './process-image-result';

describe('ProcessImageResult', () => {
  let component: ProcessImageResult;
  let fixture: ComponentFixture<ProcessImageResult>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProcessImageResult],
    }).compileComponents();

    fixture = TestBed.createComponent(ProcessImageResult);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
