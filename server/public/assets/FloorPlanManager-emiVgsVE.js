import { r as reactExports, j as jsxRuntimeExports, C as Card, M as Map, B as Button, R as RefreshCw, S as SlidersVertical, A as Alert, a as Compass, T as Table, b as Badge, F as FloorPlanStudioModal, c as API_BASE } from "./index-aHU7xcqN.js";
const FloorPlanManager = ({ onSave }) => {
  const [floorPlans, setFloorPlans] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [showStudio, setShowStudio] = reactExports.useState(false);
  const [studioFloor, setStudioFloor] = reactExports.useState(1);
  const [notification, setNotification] = reactExports.useState(null);
  const fetchFloorPlans = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const floorsToCheck = [-1, 1, 2, 3, 4];
      const promises = floorsToCheck.map(
        (f) => fetch(`${API_BASE}/api/security/maps/active?floor=${f}`, {
          headers: { "Authorization": `Bearer ${token}` }
        }).then((r) => r.json()).catch(() => null)
      );
      const results = await Promise.all(promises);
      const foundPlans = results.filter((r) => r && r.success && r.data && r.data.id).map((r) => r.data);
      const uniqueMap = new Map();
      foundPlans.forEach((p) => uniqueMap.set(p.floor_number, p));
      setFloorPlans(Array.from(uniqueMap.values()).sort((a, b) => a.floor_number - b.floor_number));
    } catch (err) {
      console.error("[FloorPlanManager] Error fetching maps:", err);
    } finally {
      setLoading(false);
    }
  };
  reactExports.useEffect(() => {
    fetchFloorPlans();
  }, []);
  const handleStudioOpen = (floorNum) => {
    setStudioFloor(floorNum);
    setShowStudio(true);
  };
  const handleSaveSuccess = (savedPlan) => {
    setNotification({ type: "success", text: `Floor ${savedPlan.floor_number} calibrated & activated.` });
    fetchFloorPlans();
    if (onSave) onSave(savedPlan);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "bg-dark border-secondary text-light h-100", style: { backgroundColor: "#0c101d", borderColor: "#1e293b" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card.Header, { className: "border-bottom border-secondary d-flex align-items-center justify-content-between", style: { borderColor: "#1e293b" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "d-flex align-items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Map, { size: 18, className: "text-info" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h6", { className: "mb-0 text-uppercase font-monospace", style: { letterSpacing: "0.5px" }, children: "Multi-Floor Architecture & Georeferencing" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "d-flex align-items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "outline-secondary",
            size: "sm",
            onClick: fetchFloorPlans,
            disabled: loading,
            className: "d-flex align-items-center gap-1",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { size: 13, className: loading ? "animate-spin" : "" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "info",
            size: "sm",
            className: "d-flex align-items-center gap-1 fw-bold text-dark",
            onClick: () => handleStudioOpen(1),
            style: { background: "linear-gradient(135deg, #00f0ff 0%, #0091ea 100%)", border: "none" },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SlidersVertical, { size: 14 }),
              " OPEN STUDIO"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card.Body, { children: [
      notification && /* @__PURE__ */ jsxRuntimeExports.jsx(
        Alert,
        {
          variant: notification.type,
          onClose: () => setNotification(null),
          dismissible: true,
          className: "bg-dark border-info text-info small py-2",
          children: notification.text
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 mb-4 rounded", style: { background: "rgba(0, 240, 255, 0.05)", border: "1px solid rgba(0, 240, 255, 0.2)" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "d-flex align-items-start gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Compass, { size: 28, className: "text-info mt-1" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h6", { className: "text-info mb-1 fw-bold", children: "Industrial Georeferencing Engine" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted small mb-2", children: "Align architectural blueprints directly over satellite imagery with 4-corner affine projection. Trace walkable corridors to constrain mobile guard positions using particle filtering." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "d-flex gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              variant: "outline-info",
              size: "sm",
              onClick: () => handleStudioOpen(1),
              className: "d-flex align-items-center gap-1 fw-semibold",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(SlidersVertical, { size: 13 }),
                " Launch Georeferencing Studio"
              ]
            }
          ) })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h6", { className: "text-muted small mb-0 font-monospace", children: "HOSPITAL LEVELS & BLUEPRINTS" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "d-flex gap-1", children: [-1, 1, 2, 3, 4].map((lvl) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "outline-secondary",
            size: "sm",
            style: { fontSize: "11px", padding: "2px 8px" },
            onClick: () => handleStudioOpen(lvl),
            children: [
              "+ Level ",
              lvl <= 0 ? `B${Math.abs(lvl) + 1}` : `L${lvl}`
            ]
          },
          lvl
        )) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-responsive", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { hover: true, variant: "dark", className: "border-secondary align-middle small mb-0", style: { borderColor: "#1e293b" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "text-muted text-uppercase", style: { fontSize: "10px" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "LEVEL" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "BUILDING" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "STATUS" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "ROTATION" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "CORRIDORS" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "ZONES" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-end", children: "ACTIONS" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: floorPlans.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, className: "text-center py-4 text-muted", children: 'No active floor blueprints found. Click "Open Studio" to upload and calibrate level 1.' }) }) : floorPlans.map((fp) => {
          var _a, _b, _c;
          const fl = fp.floor_number;
          const floorLabel = fl <= 0 ? `Basement ${Math.abs(fl) + 1}` : `Floor ${fl}`;
          const isCalibrated = fp.calibration_status === "calibrated" || fp.calibration_status === "fine_tuned";
          const corridorCount = ((_b = (_a = fp.walkable_graph) == null ? void 0 : _a.nodes) == null ? void 0 : _b.length) || 0;
          const zoneCount = ((_c = fp.zones) == null ? void 0 : _c.length) || 0;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "fw-bold font-monospace text-info", children: floorLabel }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: fp.building_name || "Main Complex" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { bg: isCalibrated ? "success" : "warning", className: "text-uppercase", style: { fontSize: "10px" }, children: fp.calibration_status || "uncalibrated" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "font-monospace", children: fp.rotation_deg != null ? `${parseFloat(fp.rotation_deg).toFixed(1)}°` : "0.0°" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { bg: corridorCount > 0 ? "info" : "secondary", className: "text-dark", children: [
              corridorCount,
              " nodes"
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { bg: zoneCount > 0 ? "primary" : "secondary", children: [
              zoneCount,
              " zones"
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-end", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Button,
              {
                variant: "outline-info",
                size: "sm",
                onClick: () => handleStudioOpen(fl),
                style: { fontSize: "11px", padding: "2px 8px" },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SlidersVertical, { size: 12, className: "me-1" }),
                  " Calibrate"
                ]
              }
            ) })
          ] }, fp.id);
        }) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      FloorPlanStudioModal,
      {
        isOpen: showStudio,
        onClose: () => setShowStudio(false),
        initialFloor: studioFloor,
        onSaveSuccess: handleSaveSuccess
      }
    )
  ] });
};
export {
  FloorPlanManager as default
};
