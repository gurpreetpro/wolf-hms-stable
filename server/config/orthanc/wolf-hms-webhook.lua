-- ============================================================
-- Orthanc Lua Script for Wolf HMS Integration
-- ============================================================
-- 
-- This script configures Orthanc to send webhook notifications
-- to Wolf HMS when DICOM studies/series/instances are stored.
--
-- INSTALLATION:
-- 1. Copy this file to your Orthanc configuration directory
-- 2. Add to orthanc.json: "LuaScripts": ["wolf-hms-webhook.lua"]
-- 3. Restart Orthanc
--
-- ============================================================

-- Configuration
local WOLF_HMS_URL = os.getenv("WOLF_HMS_URL") or "http://localhost:8080"
local WOLF_WEBHOOK_SECRET = os.getenv("WOLF_WEBHOOK_SECRET") or "wolf-orthanc-secret-2026"

-- Helper function to send HTTP POST
function SendWebhook(endpoint, payload)
    local url = WOLF_HMS_URL .. endpoint
    local headers = {
        ["Content-Type"] = "application/json",
        ["secret"] = WOLF_WEBHOOK_SECRET
    }
    
    -- Use Orthanc's built-in HTTP client
    local success, body = pcall(function()
        return HttpPost(url, DumpJson(payload), headers)
    end)
    
    if success then
        print("[Wolf HMS] Webhook sent to " .. endpoint)
    else
        print("[Wolf HMS] Webhook failed: " .. tostring(body))
    end
end

-- ============================================================
-- CALLBACK: On Stable Study (Study is complete, no more images expected)
-- This is the PRIMARY callback for Wolf HMS integration
-- ============================================================
function OnStableStudy(studyId, tags, metadata)
    print("[Wolf HMS] Study stable: " .. studyId)
    
    local study = RestApiGet("/studies/" .. studyId)
    local studyDetails = ParseJson(study)
    
    local payload = {
        ID = studyId,
        MainDicomTags = studyDetails.MainDicomTags,
        PatientMainDicomTags = studyDetails.PatientMainDicomTags,
        Series = {}
    }
    
    -- Fetch series info
    for _, seriesId in ipairs(studyDetails.Series) do
        local series = ParseJson(RestApiGet("/series/" .. seriesId))
        table.insert(payload.Series, {
            ID = seriesId,
            MainDicomTags = series.MainDicomTags,
            Instances = series.Instances
        })
    end
    
    SendWebhook("/api/pacs/webhook/study", payload)
end

-- ============================================================
-- CALLBACK: On Stable Series (Series is complete)
-- Optional: Can be disabled for high-volume environments
-- ============================================================
function OnStableSeries(seriesId, tags, metadata)
    print("[Wolf HMS] Series stable: " .. seriesId)
    
    local series = ParseJson(RestApiGet("/series/" .. seriesId))
    
    local payload = {
        ID = seriesId,
        ParentStudy = series.ParentStudy,
        MainDicomTags = series.MainDicomTags,
        Instances = series.Instances
    }
    
    SendWebhook("/api/pacs/webhook/series", payload)
end

-- ============================================================
-- CALLBACK: On Stored Instance (Each individual image)
-- WARNING: High traffic - disable in production if not needed
-- ============================================================
-- function OnStoredInstance(instanceId, tags, metadata, origin)
--     print("[Wolf HMS] Instance stored: " .. instanceId)
--     
--     local instance = ParseJson(RestApiGet("/instances/" .. instanceId))
--     
--     local payload = {
--         ID = instanceId,
--         ParentSeries = instance.ParentSeries,
--         MainDicomTags = instance.MainDicomTags
--     }
--     
--     SendWebhook("/api/pacs/webhook/instance", payload)
-- end

-- ============================================================
-- CALLBACK: On Stable Patient (Patient demographic update)
-- ============================================================
function OnStablePatient(patientId, tags, metadata)
    print("[Wolf HMS] Patient stable: " .. patientId)
    
    local patient = ParseJson(RestApiGet("/patients/" .. patientId))
    
    local payload = {
        ID = patientId,
        MainDicomTags = patient.MainDicomTags
    }
    
    SendWebhook("/api/pacs/webhook/patient", payload)
end

-- ============================================================
-- STARTUP LOG
-- ============================================================
print("==============================================")
print("Wolf HMS Orthanc Integration Script Loaded")
print("Target: " .. WOLF_HMS_URL)
print("==============================================")
