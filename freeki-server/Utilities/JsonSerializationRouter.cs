#if UNITY_STANDALONE || UNITY_EDITOR
using Newtonsoft.Json;
#else
using System.Text.Json;
#endif

// Wrapper to route Unity JSON serialize/deserialize to another backend.
// Currently this is set to NewtonSoft, but could also be routed to Unity's IL2CPP compatible JsonUtility
// class provided the classes adhere to the strict limitations it imposes.
public static class JsonSerializationRouter
{
    public static T? Deserialize<T>(string json) where T : class
    {
    #if UNITY_STANDALONE || UNITY_EDITOR
        return JsonConvert.DeserializeObject<T>(json);
    #else
        return JsonSerializer.Deserialize<T>(json);
    #endif
    }

    public static string Serialize<T>(T obj) where T : class
    {
    #if UNITY_STANDALONE || UNITY_EDITOR
        return JsonConvert.SerializeObject(obj);
    #else
        return JsonSerializer.Serialize<T>(obj);
    #endif
    }
}

