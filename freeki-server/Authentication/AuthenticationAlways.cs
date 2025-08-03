using Logging;

namespace Authentication
{
	// This checks nothing, only for use in non-production builds, generally.
	public class AuthenticationAlways : IAuthentication
	{
		private ILogging _logger;

		public AuthenticationAlways(ILogging logger)
		{
			_logger = logger;
		}

		// This is set up to be a very simple format that is implicitly trusted (and should never be used in production).
		// accountId<->full name<->email<->role,role,role
		public (string?, string?, string?, string[]?) Authenticate(string jwt)
		{
			string?   accountId = null;
			string?   fullName  = null;
			string?   email     = null;
			string[]? roles     = null;

			if (jwt!=null)
			{
				string[] parts = jwt.Split('<', '>');
				if (parts.Length >= 4)
				{
					accountId = parts[0];
					fullName  = parts[1];
					email     = parts[2];
					roles     = parts[3].Split(',');
					_logger.Log(EVerbosity.Info, $"AuthenticationAlways: {jwt} -> accountId={accountId} name={fullName} email={email} roles={string.Join(',', roles)}");
				}
				else
				{
					_logger.Log(EVerbosity.Warning, $"AuthenticationAlways: Invalid format for authentication string: {jwt}");
				}
			}
			return (accountId, fullName, email, roles);
		}
	}
}
