import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("LandingPage Phone Screen Overlay Alignment", () => {
  it("projects the phone screen overlay to align perfectly with the mockup image screen boundaries", () => {
    // 1. Read the served styles.css
    const cssPath = path.resolve(__dirname, "../styles.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    // 2. Extract matrix3d values from the .phone-screen-container rule
    // Matches: transform: matrix3d(val1, val2, ..., val16);
    const matrixRegex = /\.phone-screen-container\s*\{[^}]*transform:\s*matrix3d\(([^)]+)\)/s;
    const match = cssContent.match(matrixRegex);

    expect(match).not.toBeNull();
    const matrixValuesStr = match![1];
    const m = matrixValuesStr.split(",").map((val) => parseFloat(val.trim()));

    expect(m.length).toBe(16);

    // m is in column-major order:
    // m[0] = h0, m[1] = h3, m[2] = 0, m[3] = h6
    // m[4] = h1, m[5] = h4, m[6] = 0, m[7] = h7
    // m[8] = 0,  m[9] = 0,  m[10]= 1, m[11]= 0
    // m[12]= h2, m[13]= h5, m[14]= 0, m[15]= 1
    const h0 = m[0];
    const h3 = m[1];
    const h6 = m[3];
    
    const h1 = m[4];
    const h4 = m[5];
    const h7 = m[7];
    
    const h2 = m[12];
    const h5 = m[13];

    // Source iframe coordinates
    const w = 320;
    const h = 680;
    const srcCorners = [
      { name: "Top-Left", x: 0, y: 0, targetX: 508, targetY: 156 },
      { name: "Top-Right", x: w, y: 0, targetX: 739, targetY: 160 },
      { name: "Bottom-Left", x: 0, y: h, targetX: 560, targetY: 675 },
      { name: "Bottom-Right", x: w, y: h, targetX: 800, targetY: 680 },
    ];

    // Project using 2D homography equations:
    // w' = h6 * x + h7 * y + 1
    // x' = (h0 * x + h1 * y + h2) / w'
    // y' = (h3 * x + h4 * y + h5) / w'
    const tolerance = 1.0; // max 1.0 pixel offset allowed

    srcCorners.forEach((corner) => {
      const wPrime = h6 * corner.x + h7 * corner.y + 1;
      const xPrime = (h0 * corner.x + h1 * corner.y + h2) / wPrime;
      const yPrime = (h3 * corner.x + h4 * corner.y + h5) / wPrime;

      // Verify alignment coordinates
      expect(Math.abs(xPrime - corner.targetX)).toBeLessThan(tolerance);
      expect(Math.abs(yPrime - corner.targetY)).toBeLessThan(tolerance);
    });
  });
});
