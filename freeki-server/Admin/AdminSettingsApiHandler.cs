using System;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.IO;
using Authentication;
using Logging;
using Storage;

namespace Admin
{
    //-------------------
    /*
    | Method | URL                    | Purpose                                |
    | ------ | ---------------------- | -------------------------------------- |
    | GET    | `/api/admin/settings`  | Get admin settings (auth required)     |
    | POST   | `/api/admin/settings`  | Save admin settings (admin role req.)  |
    */
    // Handles /api/admin/settings endpoint - allows anyone authenticated to GET, only admins to POST
    public class AdminSettingsApiHandler
    {
        private readonly IStorage        _storage;
        private readonly IAuthentication _authentication;
        private readonly ILogging        _logger;
        private const string             SETTINGS_FILE = "freeki.config";

        public AdminSettingsApiHandler(IStorage storage, IAuthentication authentication, ILogging logger)
        {
            _storage        = storage;
            _authentication = authentication;
            _logger         = logger;
        }

        // Main entry point for /api/admin/settings requests - handles authentication and delegates to HandleRequest
        public async Task<(int, string, byte[])> HandleAdminSettings(HttpListenerContext httpListenerContext)
        {
            // Authenticate the request - required for all operations
            (string? accountId, string? fullName, string? email, string[]? roles) = _authentication.AuthenticateRequest(httpListenerContext.Request.Headers.GetValues("Authorization"));
            if (accountId == null)
            {
                _logger.Log(EVerbosity.Error, $"{httpListenerContext.Request.Url} Unauthorized");
                return (401, "text/plain", Encoding.UTF8.GetBytes("Unauthorized"));
            }

            return await HandleRequest(httpListenerContext, accountId, roles).ConfigureAwait(false);
        }

        public async Task<(int, string, byte[])> HandleRequest(HttpListenerContext httpListenerContext, string accountId, string[]? roles)
        {
            string httpMethod = httpListenerContext.Request.HttpMethod;
            
            try
            {
                if (httpMethod == "GET")
                {
                    return await HandleGetSettings().ConfigureAwait(false);
                }
                else if (httpMethod == "POST")
                {
                    // Check if user has admin role
                    bool isAdmin = roles != null && Array.IndexOf(roles, IAuthentication.kAdminRole) >= 0;
                    if (!isAdmin)
                    {
                        _logger.Log(EVerbosity.Warning, $"Non-admin user {accountId} attempted to modify admin settings");
                        return (403, "text/plain", Encoding.UTF8.GetBytes("Admin role required to modify settings"));
                    }

                    return await HandleSaveSettings(httpListenerContext, accountId).ConfigureAwait(false);
                }
                else
                {
                    return (405, "text/plain", Encoding.UTF8.GetBytes("Method not allowed"));
                }
            }
            catch (Exception ex)
            {
                _logger.Log(EVerbosity.Error, $"AdminSettingsApiHandler.HandleRequest: Error handling admin settings request: {ex.Message}");
                return (500, "text/plain", Encoding.UTF8.GetBytes("Internal server error"));
            }
        }

        // GET /api/admin/settings - Fetch current admin settings
        private async Task<(int, string, byte[])> HandleGetSettings()
        {
            try
            {
                byte[]? settingsData = await _storage.Read(SETTINGS_FILE).ConfigureAwait(false);
                if (settingsData != null)
                {
                    return (200, "application/json", settingsData);
                }
                else
                {
                    // Return 404 when no config file exists - let client handle defaults
                    return (404, "application/json", Encoding.UTF8.GetBytes("{}"));
                }
            }
            catch (Exception ex)
            {
                _logger.Log(EVerbosity.Error, $"AdminSettingsApiHandler.HandleGetSettings: Error reading admin settings: {ex.Message}");
                return (500, "text/plain", Encoding.UTF8.GetBytes("Error reading settings"));
            }
        }

        // POST /api/admin/settings - Save admin settings
        private async Task<(int, string, byte[])> HandleSaveSettings(HttpListenerContext httpListenerContext, string accountId)
        {
            try
            {
                // Read JSON from request body
                string jsonContent = string.Empty;
                using (StreamReader reader = new StreamReader(httpListenerContext.Request.InputStream))
                {
                    jsonContent = await reader.ReadToEndAsync().ConfigureAwait(false);
                }
                
                if (string.IsNullOrWhiteSpace(jsonContent))
                {
                    _logger.Log(EVerbosity.Warning, $"AdminSettingsApiHandler.HandleSaveSettings: Empty request body from {accountId}");
                    return (400, "text/plain", Encoding.UTF8.GetBytes("Request body cannot be empty"));
                }
                
                // Validate JSON by attempting to parse it
                JsonDocument.Parse(jsonContent);
                
                // Store the settings as raw JSON in freeki.config
                byte[] settingsData = Encoding.UTF8.GetBytes(jsonContent);
                bool success = await _storage.Write(SETTINGS_FILE, settingsData).ConfigureAwait(false);
                if (success)
                {
                    _logger.Log(EVerbosity.Info, $"AdminSettingsApiHandler.HandleSaveSettings: Admin settings updated by {accountId}");
                    object response = new { success = true };
                    string jsonResponse = JsonSerializer.Serialize(response);
                    return (200, "application/json", Encoding.UTF8.GetBytes(jsonResponse));
                }
                else
                {
                    _logger.Log(EVerbosity.Error, $"AdminSettingsApiHandler.HandleSaveSettings: Failed to write settings file for {accountId}");
                    return (500, "text/plain", Encoding.UTF8.GetBytes("Failed to save settings"));
                }
            }
            catch (JsonException ex)
            {
                _logger.Log(EVerbosity.Warning, $"AdminSettingsApiHandler.HandleSaveSettings: Invalid JSON from {accountId}: {ex.Message}");
                return (400, "text/plain", Encoding.UTF8.GetBytes("Invalid JSON format"));
            }
            catch (Exception ex)
            {
                _logger.Log(EVerbosity.Error, $"AdminSettingsApiHandler.HandleSaveSettings: Error saving admin settings from {accountId}: {ex.Message}");
                return (500, "text/plain", Encoding.UTF8.GetBytes("Internal server error"));
            }
        }
    }
}