declare module "approx-string-match" {
  interface Match {
    start: number;
    end: number;
    errors: number;
  }
  export default function search(text: string, pattern: string, maxErrors: number): Match[];
}

