import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Chart, ChartConfiguration } from 'chart.js/auto';

@Component({
  selector: 'app-chart-canvas',
  standalone: true,
  template: `
    <div [style.height.px]="height">
      <canvas #canvas role="img" [attr.aria-label]="ariaLabel">{{ ariaLabel }}</canvas>
    </div>
  `,
})
export class ChartCanvasComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) config!: ChartConfiguration;
  @Input() ariaLabel = 'Chart';
  @Input() height = 280;

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;

  ngAfterViewInit(): void {
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.canvasRef) {
      this.render();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private render(): void {
    this.chart?.destroy();
    this.chart = new Chart(this.canvasRef.nativeElement, {
      ...this.config,
      options: { responsive: true, maintainAspectRatio: false, ...this.config.options },
    });
  }
}
