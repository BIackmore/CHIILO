import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcessImage } from './process-image';

describe('ProcessImage', () => {
  let component: ProcessImage;
  let fixture: ComponentFixture<ProcessImage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProcessImage],
    }).compileComponents();

    fixture = TestBed.createComponent(ProcessImage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
