// Patch for recharts LegendPayload type to allow 'type' as string, not just 'none'.
declare module "recharts" {
  export interface LegendPayload {
    value: string | number;
    color?: string;
    dataKey?: string | number;
    name?: string;
    payload?: {
      fill?: string;
      [key: string]: any;
    };
    type?: string; // Accept any string
    [key: string]: any;
  }
}
