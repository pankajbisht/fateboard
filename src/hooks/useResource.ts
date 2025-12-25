// src/hooks/useResource.js
import { useState, useEffect } from 'react';

export function useResource(key) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!key) return;

        const fetchData = async () => {
            try {
                const response = await fetch(`http://localhost:4000/${key}`);
                const result = await response.json();
                setData(Array.isArray(result) ? result : []);
            } catch (error) {
                console.error(`Failed to fetch ${key}:`, error);
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [key]);

    return { data, loading, setData };
}
