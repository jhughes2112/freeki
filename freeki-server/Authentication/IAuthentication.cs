namespace Authentication
{
	// This allows us to have pluggable account authentication.  
	public interface IAuthentication
	{
		const string kAdminRole = "Admin";

		// authstring is a JWT that is cracked into parts.  If it's invalid, accountId is returned null.  Otherwise you get a valid accountId and non-null roles.
		// Full name and email may or may not be set, so be prepared to fall back to accountId to display something, but always trust accountId is a unique string.
		// (accountId, full name, email, roles[])
		public (string?, string?, string?, string[]?) Authenticate(string authstring);
	}
}
