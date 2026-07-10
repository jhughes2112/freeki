using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;
using Storage;

// AOT-safe JSON serialization.  Every type that crosses a JsonSerializer call must be registered
// here so the source generator emits the (de)serialization code at compile time.  Reflection-based
// serialization is unavailable in a native AOT build.
namespace Utilities
{
	// Response shape for GET /api/user/me
	public class UserInfoResponse
	{
		public string?   accountId   { get; set; }
		public string?   fullName    { get; set; }
		public string?   email       { get; set; }
		public string[]? roles       { get; set; }
		public bool      isAdmin     { get; set; }
		public string?   gravatarUrl { get; set; }
	}

	// Response shape for DELETE /api/pages/{id}
	public class PageIdResponse
	{
		public string? PageId { get; set; }
	}

	// Response shape for POST /api/pages/{id}/retrieve
	public class RetrievedPageResponse
	{
		public PageMetadata? metadata { get; set; }
		public string?       content  { get; set; }
	}

	// Entry shape for GET /api/media listing
	public class MediaFileInfo
	{
		public string? filepath     { get; set; }
		public long    size         { get; set; }
		public string? contentType  { get; set; }
		public long    lastModified { get; set; }  // UTC seconds so the client can convert to local time
	}

	// Response shape for POST/PUT /api/media/{filepath}
	public class MediaWriteResponse
	{
		public string? filepath    { get; set; }
		public long    size        { get; set; }
		public string? contentType { get; set; }
	}

	// Response shape for DELETE /api/media/{filepath}
	public class MediaDeleteResponse
	{
		public string? filepath { get; set; }
	}

	// Response shape for POST /api/admin/settings
	public class SuccessResponse
	{
		public bool success { get; set; }
	}

	// Default naming (properties serialize exactly as declared) — used for all API responses.
	[JsonSerializable(typeof(CommitInfo))]
	[JsonSerializable(typeof(List<CommitInfo>))]
	[JsonSerializable(typeof(Authentication.OAuth2Helper.OAuthConfiguration))]
	[JsonSerializable(typeof(Authentication.OAuth2Helper.KeySet))]
	[JsonSerializable(typeof(PageMetadata))]
	[JsonSerializable(typeof(List<PageMetadata>))]
	[JsonSerializable(typeof(Page))]
	[JsonSerializable(typeof(List<string>))]
	[JsonSerializable(typeof(UserInfoResponse))]
	[JsonSerializable(typeof(PageIdResponse))]
	[JsonSerializable(typeof(RetrievedPageResponse))]
	[JsonSerializable(typeof(MediaFileInfo))]
	[JsonSerializable(typeof(List<MediaFileInfo>))]
	[JsonSerializable(typeof(MediaWriteResponse))]
	[JsonSerializable(typeof(MediaDeleteResponse))]
	[JsonSerializable(typeof(SuccessResponse))]
	[JsonSerializable(typeof(JsonElement))]
	[JsonSerializable(typeof(JsonElement[]))]
	public partial class FreeKiJsonContext : JsonSerializerContext
	{
	}

	// CamelCase naming — used only for the page file format on disk (PageSerializer),
	// which historically wrote camelCase metadata and must keep reading/writing it.
	[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
	[JsonSerializable(typeof(PageMetadata))]
	public partial class PageFileJsonContext : JsonSerializerContext
	{
	}
}
