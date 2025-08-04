using System;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Authentication;
using Logging;

namespace Users
{
    //-------------------
    /*
    | Method | URL             | Purpose                     |
    | ------ | --------------- | --------------------------- |
    | GET    | `/api/user/me`  | Get current user info       |
    */
    // Handles all /api/user endpoints
    public class UserApiHandler
    {
        private IAuthentication _authentication;
        private ILogging _logger;

        public UserApiHandler(IAuthentication authentication, ILogging logger)
        {
            _authentication = authentication;
            _logger = logger;
        }

        public Task<(int, string, byte[])> GetCurrentUser(HttpListenerContext httpListenerContext)
        {
            // Authenticate the request
            (string? accountId, string? fullName, string? email, string[]? roles) = AuthenticateRequest(httpListenerContext);
            if (accountId == null)
            {
                _logger.Log(EVerbosity.Error, $"{httpListenerContext.Request.Url} Unauthorized");
                return Task.FromResult((401, "text/plain", Encoding.UTF8.GetBytes("Unauthorized")));
            }

            // Create user info response
            var userInfo = new
            {
                accountId = accountId,
                fullName = fullName ?? accountId,
                email = email,
                roles = roles ?? Array.Empty<string>(),
                isAdmin = roles != null && Array.IndexOf(roles, IAuthentication.kAdminRole) >= 0,
                gravatarUrl = !string.IsNullOrEmpty(email) ? GetGravatarUrl(email) : null
            };

            string jsonResponse = JsonSerializer.Serialize(userInfo);
            return Task.FromResult((200, "application/json", Encoding.UTF8.GetBytes(jsonResponse)));
        }

        private (string?, string?, string?, string[]?) AuthenticateRequest(HttpListenerContext httpListenerContext)
        {
            string[]? authHeader = httpListenerContext.Request.Headers.GetValues("Authorization");
            if (authHeader == null || authHeader.Length < 1)
                return (null, null, null, null);

            string token = authHeader[0];
            if (token.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                token = token.Substring("Bearer ".Length).Trim();
            }
            return _authentication.Authenticate(token);
        }

        private string GetGravatarUrl(string email)
        {
            // Create SHA256 hash of email (lowercased and trimmed)
            using (var sha256 = System.Security.Cryptography.SHA256.Create())
            {
                string normalizedEmail = email.Trim().ToLowerInvariant();
                byte[] emailBytes = Encoding.UTF8.GetBytes(normalizedEmail);
                byte[] hashBytes = sha256.ComputeHash(emailBytes);
                
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < hashBytes.Length; i++)
                {
                    sb.Append(hashBytes[i].ToString("x2"));
                }
                
                return $"https://www.gravatar.com/avatar/{sb.ToString()}?d=identicon&s=32";
            }
        }
    }
}