import { useEffect, useState } from "react";

export default function useFetch(requestFn, dependencies = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function run() {
      setLoading(true);
      setError("");
      try {
        const response = await requestFn();
        if (isMounted) {
          setData(response.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.detail || err.message || "Request failed");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      isMounted = false;
    };
  }, dependencies);

  return { data, loading, error, setData };
}
