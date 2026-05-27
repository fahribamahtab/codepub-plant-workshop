"use client";

import { useEffect, useRef, useState } from "react";

import { decorateReading, normalizeRawValue } from "@/lib/moisture";

const DEFAULT_WET_THRESHOLD = 1500;
const MIN_WET_THRESHOLD = 500;
const MAX_WET_THRESHOLD = 2049;
const SERIAL_BAUD_RATE = 115200;
const USB_SOURCE = "usb-serial";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function moistureColor(percent) {
  if (typeof percent !== "number") {
    return "hsl(197 15% 45%)";
  }

  const progress = clamp(percent / 100, 0, 1);
  const hue = 18 + (154 - 18) * progress;
  const saturation = 85 + (62 - 85) * progress;
  const lightness = 58 + (42 - 58) * progress;

  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

function moistureColorSoft(percent) {
  if (typeof percent !== "number") {
    return "hsl(197 18% 84% / 0.32)";
  }

  const progress = clamp(percent / 100, 0, 1);
  const hue = 18 + (154 - 18) * progress;
  const saturation = 86 + (62 - 86) * progress;
  const lightness = 58 + (52 - 58) * progress;

  return `hsl(${hue} ${saturation}% ${lightness}% / 0.18)`;
}

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return "--";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    second: "2-digit"
  });
}

function createUuid() {
  if (
    typeof window !== "undefined" &&
    window.crypto &&
    typeof window.crypto.randomUUID === "function"
  ) {
    return window.crypto.randomUUID();
  }

  const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";

  return template.replace(/[xy]/g, function (character) {
    const randomValue = Math.floor(Math.random() * 16);
    const value = character === "x" ? randomValue : (randomValue & 0x3) | 0x8;

    return value.toString(16);
  });
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });
  const payload =
    response.status === 204
      ? null
      : await response.json().catch(function () {
          return null;
        });

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed");
  }

  return payload;
}

function sourceLabel(source) {
  if (source === USB_SOURCE) {
    return "USB";
  }

  return "API";
}

function sourceDescription(source) {
  if (source === USB_SOURCE) {
    return "Live from this browser";
  }

  return "Posted by the sensor";
}

function sourceTone(source) {
  return source === USB_SOURCE ? "usb" : "api";
}

function parseRawValue(line) {
  const trimmed = line.trim();

  if (!trimmed) {
    return null;
  }

  const plainNumberMatch = trimmed.match(/^(\d{1,4})$/);

  if (plainNumberMatch) {
    return normalizeRawValue(plainNumberMatch[1]);
  }

  const legacyMatch = trimmed.match(/Raw analog:\s*(\d{1,4})/i);

  if (legacyMatch) {
    return normalizeRawValue(legacyMatch[1]);
  }

  const rawValueMatch = trimmed.match(/Raw value:\s*(\d{1,4})/i);

  if (rawValueMatch) {
    return normalizeRawValue(rawValueMatch[1]);
  }

  const jsonMatch = trimmed.match(/"rawValue"\s*:\s*(\d{1,4})/i);

  if (jsonMatch) {
    return normalizeRawValue(jsonMatch[1]);
  }

  return null;
}

function mergePlantsWithUsb(plants, activePlantId, liveReading) {
  if (!activePlantId || !liveReading) {
    return plants;
  }

  return plants.map(function (plant) {
    if (plant.id !== activePlantId) {
      return plant;
    }

    return {
      ...plant,
      latestReading: decorateReading(liveReading, plant.wetThreshold)
    };
  });
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 20l3.5-.7L18 8.8l-2.8-2.8L4.7 16.5 4 20zm12.1-15.8L19 7.1"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 9h9v11H9zM6 5h9v2M6 5H5v11h2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SourceChip({ source, subtle = false }) {
  if (!source) {
    return null;
  }

  return (
    <span
      className={`source-chip source-chip-${sourceTone(source)}${subtle ? " source-chip-subtle" : ""}`}
    >
      {sourceLabel(source)}
    </span>
  );
}

function PlantCard({ copied, onCopyUuid, onEdit, plant }) {
  const latestReading = plant.latestReading;
  const accent = moistureColor(latestReading?.moisturePercent);
  const accentSoft = moistureColorSoft(latestReading?.moisturePercent);
  const lastSeen = latestReading ? formatTimestamp(latestReading.receivedAt) : "Waiting";
  const lastSeenLabel = latestReading ? `Updated ${lastSeen}` : "Waiting for first reading";
  const moistureValue =
    latestReading && typeof latestReading.moisturePercent === "number"
      ? `${Math.round(latestReading.moisturePercent)}%`
      : "--";

  return (
    <article
      className="plant-card panel-card"
      style={{
        "--card-accent": accent,
        "--card-soft": accentSoft
      }}
    >
      <div className="card-header">
        <div className="card-header-copy">
          <SourceChip source={latestReading?.source} subtle />
          <h2 className="card-title">{plant.name}</h2>
          <p className="card-meta">{lastSeenLabel}</p>
        </div>
        <button
          aria-label={`Edit ${plant.name}`}
          className="icon-button"
          onClick={function () {
            onEdit(plant);
          }}
          type="button"
        >
          <PencilIcon />
        </button>
      </div>

      <div className="card-hero">
        <div>
          <p className="card-moisture">{moistureValue}</p>
          <p className="card-update">Latest moisture snapshot</p>
        </div>
        <div className="card-glow"></div>
      </div>
      <div className="card-footer">
        {/* <div className="uuid-block">
          <span className="mini-label">UUID</span>
          <code>{plant.id}</code>
        </div> */}
        <button
          className="copy-button"
          onClick={function () {
            onCopyUuid(plant.id);
          }}
          type="button"
        >
          <CopyIcon />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </article>
  );
}

function Modal({ children, onClose, open, wide = false }) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className={`modal-panel${wide ? " modal-panel-wide" : ""}`}
        onClick={function (event) {
          event.stopPropagation();
        }}
        role="dialog"
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ children, onClose, title }) {
  return (
    <div className="modal-head modal-head-split">
      <div>{children}</div>
      <button
        aria-label={`Close ${title}`}
        className="modal-close-button"
        onClick={onClose}
        type="button"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

export default function DashboardShell({ initialPlants }) {
  const [plants, setPlants] = useState(initialPlants);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createId, setCreateId] = useState("");
  const [createError, setCreateError] = useState("");
  const [copyFeedbackId, setCopyFeedbackId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPlantId, setSelectedPlantId] = useState(null);
  const [detailError, setDetailError] = useState("");
  const [editName, setEditName] = useState("");
  const [editThreshold, setEditThreshold] = useState(DEFAULT_WET_THRESHOLD);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [serialBusy, setSerialBusy] = useState(false);
  const [usbStatus, setUsbStatus] = useState("");
  const [activeUsbPlantId, setActiveUsbPlantId] = useState(null);
  const serialPortRef = useRef(null);
  const serialReaderRef = useRef(null);
  const serialReadLoopPromiseRef = useRef(null);
  const serialDisconnectPromiseRef = useRef(null);
  const serialBufferRef = useRef("");
  const activeUsbPlantIdRef = useRef(null);
  const activeUsbReadingRef = useRef(null);
  const refreshPlantsRef = useRef(async function () {});

  function overlayUsb(nextPlants) {
    return mergePlantsWithUsb(
      nextPlants,
      activeUsbPlantIdRef.current,
      activeUsbReadingRef.current
    );
  }

  useEffect(
    function syncPlants() {
      setPlants(overlayUsb(initialPlants));
    },
    [initialPlants]
  );

  refreshPlantsRef.current = async function refreshPlants() {
    try {
      const payload = await fetchJson("/api/plants");
      setPlants(overlayUsb(payload.plants));
    } catch (_error) {
      // Keep the current dashboard state until the next refresh succeeds.
    }
  };

  useEffect(function keepDashboardFresh() {
    const intervalId = window.setInterval(function () {
      void refreshPlantsRef.current();
    }, 3000);

    return function cleanup() {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(function attachSerialEvents() {
    if (!("serial" in navigator) || typeof navigator.serial.addEventListener !== "function") {
      return;
    }

    function handleDisconnect() {
      if (serialPortRef.current && !serialDisconnectPromiseRef.current) {
        void disconnectSerial("device-disconnect");
      }
    }

    navigator.serial.addEventListener("disconnect", handleDisconnect);

    return function cleanup() {
      navigator.serial.removeEventListener("disconnect", handleDisconnect);
    };
  }, []);

  useEffect(function cleanupSerialOnUnmount() {
    return function cleanup() {
      if (serialPortRef.current || serialReadLoopPromiseRef.current) {
        void disconnectSerial("unmount");
      }
    };
  }, []);

  const selectedPlant = selectedPlantId
    ? plants.find(function (plant) {
        return plant.id === selectedPlantId;
      }) || null
    : null;
  const activeUsbPlant = activeUsbPlantId
    ? plants.find(function (plant) {
        return plant.id === activeUsbPlantId;
      }) || null
    : null;
  const hasSerialSupport =
    typeof window !== "undefined" && typeof navigator !== "undefined" && "serial" in navigator;
  const selectedPlantHasUsb = Boolean(
    selectedPlant && selectedPlant.id === activeUsbPlantId && serialPortRef.current
  );
  const usbButtonLabel = selectedPlantHasUsb
    ? serialBusy
      ? "Disconnecting..."
      : "Disconnect USB"
    : serialBusy
      ? "Connecting..."
      : activeUsbPlant && selectedPlant && activeUsbPlant.id !== selectedPlant.id
        ? "Move USB here"
        : "Connect via USB";

  function closeCreateModal() {
    if (isCreating) {
      return;
    }

    setIsCreateOpen(false);
    setCreateError("");
  }

  function closeEditModal() {
    if (isSaving || isDeleting) {
      return;
    }

    setSelectedPlantId(null);
    setDetailError("");
  }

  function openCreateModal() {
    setCreateError("");
    setCreateName("");
    setCreateId(createUuid());
    setIsCreateOpen(true);
  }

  function openEditModal(plant) {
    setDetailError("");
    setSelectedPlantId(plant.id);
    setEditName(plant.name);
    setEditThreshold(plant.wetThreshold);
  }

  async function handleCopyUuid(plantId) {
    try {
      await navigator.clipboard.writeText(plantId);
      setCopyFeedbackId(plantId);
      window.setTimeout(function () {
        setCopyFeedbackId("");
      }, 1600);
    } catch (_error) {
      window.prompt("Copy UUID", plantId);
    }
  }

  const endpointPreview =
    selectedPlantId && typeof window !== "undefined"
      ? `${window.location.origin}/api/plants/${selectedPlantId}/readings`
      : selectedPlantId
        ? `/api/plants/${selectedPlantId}/readings`
        : "";

  function applyUsbReading(plantId, rawValue) {
    const reading = {
      rawValue,
      receivedAt: new Date().toISOString(),
      source: USB_SOURCE
    };

    activeUsbReadingRef.current = reading;
    setUsbStatus("USB streaming");
    setPlants(function (currentPlants) {
      return currentPlants.map(function (plant) {
        if (plant.id !== plantId) {
          return plant;
        }

        return {
          ...plant,
          latestReading: decorateReading(reading, plant.wetThreshold)
        };
      });
    });
    void postUsbReading(plantId, reading);
  }

  async function postUsbReading(plantId, reading) {
    try {
      const payload = await fetchJson(`/api/plants/${plantId}/readings`, {
        body: JSON.stringify({
          rawValue: reading.rawValue,
          source: USB_SOURCE
        }),
        method: "POST"
      });

      if (payload?.plant) {
        setPlants(function (currentPlants) {
          return overlayUsb(
            currentPlants.map(function (plant) {
              return plant.id === payload.plant.id ? payload.plant : plant;
            })
          );
        });
      }
    } catch (_error) {
      setUsbStatus("USB streaming, sync failed");
    }
  }

  function handleSerialLine(line, plantId) {
    const rawValue = parseRawValue(line);

    if (rawValue === null) {
      return;
    }

    applyUsbReading(plantId, rawValue);
  }

  async function readSerialLoop(port, plantId) {
    const decoder = new TextDecoder();

    while (serialPortRef.current === port && port.readable) {
      const reader = port.readable.getReader();
      serialReaderRef.current = reader;

      try {
        while (true) {
          const result = await reader.read();

          if (result.done) {
            break;
          }

          serialBufferRef.current += decoder.decode(result.value, {
            stream: true
          });

          const lines = serialBufferRef.current.split(/\r?\n/);
          serialBufferRef.current = lines.pop() || "";

          for (const line of lines) {
            handleSerialLine(line, plantId);
          }
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          setUsbStatus("USB error");
        }
      } finally {
        if (serialReaderRef.current === reader) {
          serialReaderRef.current = null;
        }

        try {
          reader.releaseLock();
        } catch (_error) {
          // No-op when the reader is already released.
        }
      }
    }

    if (serialPortRef.current === port) {
      serialPortRef.current = null;

      try {
        await port.close();
      } catch (_error) {
        // The port may already be closed by the browser.
      }

      activeUsbPlantIdRef.current = null;
      activeUsbReadingRef.current = null;
      serialBufferRef.current = "";
      setActiveUsbPlantId(null);
      setUsbStatus("USB disconnected");
      void refreshPlantsRef.current();
    }
  }

  async function disconnectSerial(reason = "user-request") {
    if (serialDisconnectPromiseRef.current) {
      return serialDisconnectPromiseRef.current;
    }

    const port = serialPortRef.current;
    const reader = serialReaderRef.current;

    if (!port && !serialReadLoopPromiseRef.current) {
      activeUsbPlantIdRef.current = null;
      activeUsbReadingRef.current = null;
      serialBufferRef.current = "";
      setActiveUsbPlantId(null);
      setUsbStatus("");
      return;
    }

    setSerialBusy(true);
    setUsbStatus(reason === "switch-plant" ? "USB switching" : "USB disconnecting");
    serialPortRef.current = null;

    serialDisconnectPromiseRef.current = (async function () {
      if (reader) {
        try {
          await reader.cancel();
        } catch (_error) {
          // The reader may already be gone.
        }
      }

      if (serialReadLoopPromiseRef.current) {
        try {
          await serialReadLoopPromiseRef.current;
        } catch (_error) {
          // Ignore read loop shutdown errors during disconnect.
        }
      }

      if (port) {
        try {
          await port.close();
        } catch (_error) {
          // The port may already be closed by the browser.
        }
      }

      serialReaderRef.current = null;
      serialReadLoopPromiseRef.current = null;
      serialBufferRef.current = "";
      activeUsbPlantIdRef.current = null;
      activeUsbReadingRef.current = null;
      setActiveUsbPlantId(null);
      setUsbStatus("");
      await refreshPlantsRef.current();
    })().finally(function () {
      serialDisconnectPromiseRef.current = null;
      setSerialBusy(false);
    });

    return serialDisconnectPromiseRef.current;
  }

  async function connectUsbToPlant(plant) {
    if (!hasSerialSupport) {
      setUsbStatus("Web Serial unsupported");
      return;
    }

    try {
      setSerialBusy(true);

      if (serialPortRef.current) {
        await disconnectSerial("switch-plant");
      }

      setUsbStatus("USB selecting");
      const port = await navigator.serial.requestPort();
      setUsbStatus("USB opening");
      await port.open({
        baudRate: SERIAL_BAUD_RATE
      });

      serialBufferRef.current = "";
      serialPortRef.current = port;
      activeUsbPlantIdRef.current = plant.id;
      activeUsbReadingRef.current = null;
      setActiveUsbPlantId(plant.id);
      setUsbStatus("USB connected");
      serialReadLoopPromiseRef.current = readSerialLoop(port, plant.id).finally(function () {
        serialReadLoopPromiseRef.current = null;
      });
    } catch (error) {
      serialPortRef.current = null;
      activeUsbPlantIdRef.current = null;
      activeUsbReadingRef.current = null;
      setActiveUsbPlantId(null);

      if (error && error.name === "NotFoundError") {
        setUsbStatus("USB selection cancelled");
        return;
      }

      if (error && error.name === "NetworkError") {
        setUsbStatus("USB busy, close serial monitor");
        return;
      }

      if (error && error.name === "InvalidStateError") {
        setUsbStatus("USB already open");
        return;
      }

      if (error && error.name === "SecurityError") {
        setUsbStatus("USB blocked by browser");
        return;
      }

      setUsbStatus("USB failed");
    } finally {
      setSerialBusy(false);
    }
  }

  async function handleUsbButtonClick() {
    if (!selectedPlant || serialBusy) {
      return;
    }

    if (selectedPlantHasUsb) {
      await disconnectSerial("user-request");
      return;
    }

    await connectUsbToPlant(selectedPlant);
  }

  async function handleCreatePlant(event) {
    event.preventDefault();
    setIsCreating(true);
    setCreateError("");

    try {
      const payload = await fetchJson("/api/plants", {
        body: JSON.stringify({
          id: createId,
          name: createName
        }),
        method: "POST"
      });

      setPlants(function (currentPlants) {
        return [...currentPlants, payload.plant];
      });
      setIsCreateOpen(false);
      setCreateName("");
      setCreateId(createUuid());
      void refreshPlantsRef.current();
    } catch (requestError) {
      setCreateError(requestError.message);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSavePlant(event) {
    event.preventDefault();

    if (!selectedPlantId) {
      return;
    }

    setIsSaving(true);
    setDetailError("");

    try {
      const payload = await fetchJson(`/api/plants/${selectedPlantId}`, {
        body: JSON.stringify({
          name: editName,
          wetThreshold: editThreshold
        }),
        method: "PATCH"
      });

      setPlants(function (currentPlants) {
        return overlayUsb(
          currentPlants.map(function (plant) {
            return plant.id === payload.plant.id ? payload.plant : plant;
          })
        );
      });
      setSelectedPlantId(null);
      void refreshPlantsRef.current();
    } catch (requestError) {
      setDetailError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeletePlant() {
    if (!selectedPlantId) {
      return;
    }

    if (!window.confirm("Delete this plant?")) {
      return;
    }

    setIsDeleting(true);
    setDetailError("");

    try {
      if (selectedPlantId === activeUsbPlantIdRef.current) {
        await disconnectSerial("delete-plant");
      }

      await fetchJson(`/api/plants/${selectedPlantId}`, {
        method: "DELETE"
      });

      setPlants(function (currentPlants) {
        return currentPlants.filter(function (plant) {
          return plant.id !== selectedPlantId;
        });
      });
      setSelectedPlantId(null);
      void refreshPlantsRef.current();
    } catch (requestError) {
      setDetailError(requestError.message);
    } finally {
      setIsDeleting(false);
    }
  }

  function usbHelpText() {
    if (!activeUsbPlant || !selectedPlant || activeUsbPlant.id === selectedPlant.id) {
      return "";
    }

    return `USB is currently attached to ${activeUsbPlant.name}. Connecting here will switch the stream.`;
  }

  const activeSource = selectedPlantHasUsb ? USB_SOURCE : selectedPlant?.latestReading?.source || "api";

  return (
    <>
      <section className="platform-hero">
        <div className="platform-copy-block">
          <p className="eyebrow">Code Pub</p>
          <h1>Plant Health Dashboard</h1>
          <p className="platform-copy">
            Create a plant, connect the UUID, and watch its card update as new moisture readings come in.
          </p>
        </div>

        <button
          className="primary-button add-plant-button"
          onClick={openCreateModal}
          type="button"
        >
          <PlusIcon />
          Add plant
        </button>
      </section>

      {plants.length === 0 ? (
        <section className="empty-state panel-card">
          <p className="eyebrow">Start here</p>
          <h2>No plants yet.</h2>
          <p>
            Create the first plant, copy its UUID, then point a board at
            <code> /api/plants/&lt;uuid&gt;/readings</code>.
          </p>
        </section>
      ) : (
        <section className="plant-grid">
          {plants.map(function (plant) {
            return (
              <PlantCard
                copied={copyFeedbackId === plant.id}
                key={plant.id}
                onCopyUuid={handleCopyUuid}
                onEdit={openEditModal}
                plant={plant}
              />
            );
          })}
        </section>
      )}

      <Modal onClose={closeCreateModal} open={isCreateOpen}>
        <ModalHeader onClose={closeCreateModal} title="add plant">
          <p className="eyebrow">Add plant</p>
          <h2>Create a new plant card.</h2>
        </ModalHeader>

        <form className="modal-form" onSubmit={handleCreatePlant}>
          <label className="field">
            <span>Name</span>
            <input
              autoFocus
              onChange={function (event) {
                setCreateName(event.target.value);
              }}
              placeholder="Monstera Deliciosa"
              type="text"
              value={createName}
            />
          </label>

          <label className="field">
            <span>UUID</span>
            <input
              onChange={function (event) {
                setCreateId(event.target.value);
              }}
              type="text"
              value={createId}
            />
          </label>

          <p className="field-hint">
            Keep the generated UUID or replace it with your own before registering the plant.
          </p>

          {createError ? <p className="form-error">{createError}</p> : null}

          <div className="modal-actions modal-actions-end">
            <button className="primary-button" disabled={isCreating} type="submit">
              {isCreating ? "Creating..." : "Create plant"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal onClose={closeEditModal} open={Boolean(selectedPlantId)} wide>
        <ModalHeader onClose={closeEditModal} title="plant settings">
          <p className="eyebrow">Plant settings</p>
          <h2>{selectedPlant?.name || "Plant details"}</h2>
        </ModalHeader>

        {selectedPlant ? (
          <form className="modal-form modal-form-wide" onSubmit={handleSavePlant}>
            <div className="field-grid">
              <label className="field">
                <span>Plant name</span>
                <input
                  onChange={function (event) {
                    setEditName(event.target.value);
                  }}
                  type="text"
                  value={editName}
                />
              </label>

              <div className="field">
                <span>Plant UUID</span>
                <code className="code-block">{selectedPlant.id}</code>
              </div>
            </div>

            <div className="field">
              <span>POST endpoint</span>
              <code className="code-block">{endpointPreview}</code>
            </div>

            <div className="transport-panel">
              <div className="transport-copy">
                <span className="transport-label">Source</span>
                <div className="source-options">
                  {[USB_SOURCE, "api"].map(function (source) {
                    const isActive = sourceTone(activeSource) === sourceTone(source);

                    return (
                      <div
                        className={`source-option${isActive ? " source-option-active" : ""}`}
                        key={source}
                      >
                        <div>
                          <strong>{sourceLabel(source)}</strong>
                          <span>{sourceDescription(source)}</span>
                        </div>
                        {isActive ? <em>Active</em> : null}
                      </div>
                    );
                  })}
                </div>
                {usbHelpText() ? <p className="usb-status">{usbHelpText()}</p> : null}
                {usbStatus ? <p className="usb-status">{usbStatus}</p> : null}
              </div>

              <button
                className="ghost-button usb-button"
                disabled={serialBusy || !hasSerialSupport}
                onClick={handleUsbButtonClick}
                type="button"
              >
                {usbButtonLabel}
              </button>
            </div>

            <div className="field">
              <div className="field-row">
                <span>Wet threshold</span>
                <strong>{editThreshold}</strong>
              </div>
              <input
                className="slider"
                max={MAX_WET_THRESHOLD}
                min={MIN_WET_THRESHOLD}
                onChange={function (event) {
                  setEditThreshold(Number(event.target.value));
                }}
                step="1"
                type="range"
                value={editThreshold}
              />
              <div className="slider-scale">
                <span>500</span>
                <span>Default 1500</span>
                <span>2049</span>
              </div>
              <p className="field-hint">
                Lower values make wet harder to reach. Higher values make it show wet sooner.
              </p>
            </div>

            <div className="metric-grid modal-metrics">
              <div className="metric">
                <span>Latest raw</span>
                <strong>{selectedPlant.latestReading?.rawValue ?? "--"}</strong>
              </div>
              <div className="metric">
                <span>Moisture</span>
                <strong>
                  {typeof selectedPlant.latestReading?.moisturePercent === "number"
                    ? `${Math.round(selectedPlant.latestReading.moisturePercent)}%`
                    : "--"}
                </strong>
              </div>
              <div className="metric">
                <span>Last update</span>
                <strong>{formatTimestamp(selectedPlant.latestReading?.receivedAt)}</strong>
              </div>
            </div>

            {detailError ? <p className="form-error">{detailError}</p> : null}

            <div className="modal-actions modal-actions-spread">
              <button className="primary-button" disabled={isSaving || isDeleting} type="submit">
                {isSaving ? "Saving..." : "Save changes"}
              </button>
              <button
                className="danger-button"
                disabled={isDeleting || isSaving}
                onClick={handleDeletePlant}
                type="button"
              >
                {isDeleting ? "Deleting..." : "Delete plant"}
              </button>
            </div>
          </form>
        ) : (
          <div className="modal-loading">Plant not found.</div>
        )}
      </Modal>
    </>
  );
}
