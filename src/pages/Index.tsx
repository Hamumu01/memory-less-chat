import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    navigate(user ? "/dashboard" : "/login", { replace: true });
  }, [user, navigate]);

  return null;
}
