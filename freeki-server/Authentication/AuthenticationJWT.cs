using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using Logging;
using System.Text.Json;
using Shared;

namespace Authentication
{
	// This checks that the JWT was signed by the correct private key, and also checks the start/stop time.  This is production-worthy.
	public class AuthenticationJWT : IAuthentication
	{
		private Dictionary<string, RSA> _publicKeys;
//		private string                  _issuer;    // we DO NOT check that the JWT is issued by the issuer, because we are already validating the public key from the correct site signed the JWT
                                                    // It also turns out that Authentik will say the issuer is whatever the hostname is that you requested the OIDC info from, so in Local,
													// the client gets localhost:4208 and the server gets mooncast-local-authentik-server:9000
		private ILogging                _logger;

		public AuthenticationJWT(Dictionary<string, RSA> publicKeys, ILogging logger)
		{
			_publicKeys = publicKeys;
			_logger     = logger;
		}

		// Call this with httpListenerContext.Request.Headers.GetValues("Authorization");
		public (string?, string?, string?, string[]?) AuthenticateRequest(string[]? authorizationHeaders)
		{
			string? token = null;
			if (authorizationHeaders != null && authorizationHeaders.Length > 0)
			{
				token = authorizationHeaders[0];
				if (token!=null && token.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
				{
					token = token.Substring("Bearer ".Length).Trim();
				}
			}
			return Authenticate(token);
		}

		// Actual functionality of the JWT validation uses the RSA key list
		// (accountId, full name, email, roles[])
		public (string?, string?, string?, string[]?) Authenticate(string? jwt)
		{
			string?   accountId = null;
			string?   fullName  = null;
			string?   email     = null;
			string[]? roles     = null;
			try
			{
				if (string.IsNullOrEmpty(jwt)==false)
				{
					// Split the JWT into its parts
					string[] parts = jwt.Split('.');
					if (parts.Length == 3)
					{
						string header = parts[0];
						string payload = parts[1];
						string signature = parts[2];

						// Decode the header and payload
						string decodedHeader = UrlHelper.Base64UrlDecode(header);
						string decodedPayload = UrlHelper.Base64UrlDecode(payload);

						JwtHeader? jwtheader = JsonSerializer.Deserialize<JwtHeader>(decodedHeader);
						JwtPayload? jwtpayload = JsonSerializer.Deserialize<JwtPayload>(decodedPayload);

						// Extract the 'kid' from the JWT header
						if (jwtheader!=null && jwtpayload!=null && jwtheader.kid!=null)
						{
							// Find the corresponding key
							if (_publicKeys.TryGetValue(jwtheader.kid, out RSA? rsa))
							{
								// Verify the signature
								string signedData = header + "." + payload;
								byte[] signedBytes = Encoding.UTF8.GetBytes(signedData);
								byte[] signatureBytes = UrlHelper.Base64UrlDecodeBytes(signature);

								if (rsa.VerifyData(signedBytes, signatureBytes, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1))
								{
									long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
									if (jwtpayload.exp > now)
									{
										string allGroups = jwtpayload.groups==null ? string.Empty : string.Join(' ', jwtpayload.groups);
										_logger.Log(EVerbosity.Info, $"Successful authentication for {jwtpayload.sub} {jwtpayload.email ?? "NO-EMAIL"} {allGroups}");
										accountId = jwtpayload.sub;
										fullName  = jwtpayload.name;
										email     = jwtpayload.email;
										roles     = jwtpayload.groups==null ? Array.Empty<string>() : jwtpayload.groups;
									}
									else
									{
										_logger.Log(EVerbosity.Error, $"JWT has expired now {now} JWT: {jwt}");
									}
								}
								else
								{
									_logger.Log(EVerbosity.Error, $"Invalid signature for JWT: {jwt}");
								}
							}
							else
							{
								_logger.Log(EVerbosity.Error, $"Public key not found for the given kid {jwt}");
							}
						}
						else
						{
							_logger.Log(EVerbosity.Error, $"JWT header does not contain kid {jwt}");
						}
					}
					else
					{
						_logger.Log(EVerbosity.Error, "Invalid JWT format");
					}
				}
				else
				{
					_logger.Log(EVerbosity.Error, "JWT is null or empty");
				}
			}
			catch (Exception ex)
			{
				_logger.Log(EVerbosity.Error, $"JWT Validation threw an exception {ex}");
			}

			return (accountId, fullName, email, roles);
		}

		protected class JwtHeader
		{
			public string? kid { get; set; }   // this indicates what public key was used for signing
		}

		protected class JwtPayload
		{
			public string?   iss           { get; set; }  // this is supposed to always be our fusionauth/authentik server, but authentik doesn't let you configure what it returns so we can't really use it
//			public string?   applicationId { get; set; }  // fusionauth: should always be our clientId sent back to us... we should check it, otherwise someone might send us a JWT that was validly signed for some other application
			public string?   aud           { get; set; }  // authentik: returns the clientid that authenticated this user.  "thisisaclientid" is what we are using currently
			public long      exp           { get; set; }  // this is the expiration time for the JWT
			public long      iat           { get; set; }  // this is the time this JWT was issued at
			public string?   sub           { get; set; }  // this is the userid
			public string?   email         { get; set; }  // this should be something we receive
			public bool      emailVerified { get; set; }  // if true, the email link was clicked
			public string?   name          { get; set; }  // Full name
//			public string[]? roles         { get; set; }  // fusionauth
			public string[]? groups        { get; set; }  // authentik
		}
	}
}
