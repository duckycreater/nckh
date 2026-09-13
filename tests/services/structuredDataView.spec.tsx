import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  StructuredDataView,
  formatStructuredValue,
  summarizeStructuredData,
} from "../../src/components/admin/StructuredDataView";

describe("StructuredDataView", () => {
  it("renders API objects as labeled fields instead of raw JSON", () => {
    const html = renderToStaticMarkup(
      <StructuredDataView
        data={{ total_users: 12, active: true, created_at: "2026-09-13T08:30:00.000Z" }}
      />,
    );

    expect(html).toContain("Tổng người dùng");
    expect(html).toContain("12");
    expect(html).toContain("Có");
    expect(html).not.toContain("{&quot;");
    expect(html).not.toContain("JSON");
  });

  it("summarizes audit details without serializing objects", () => {
    expect(summarizeStructuredData({ status: "success", count: 4 })).toBe(
      "Trạng thái: success · Số lượng: 4",
    );
    expect(formatStructuredValue([1, 2, 3])).toBe("3 mục");
  });

  it("lets React escape untrusted strings once", () => {
    const html = renderToStaticMarkup(<StructuredDataView data={{ message: "<img src=x>" }} />);
    expect(html).toContain("&lt;img src=x&gt;");
    expect(html).not.toContain("<img src=x>");
  });
});
