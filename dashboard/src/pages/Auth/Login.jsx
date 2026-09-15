import React, { useState, useEffect } from "react";
import { Form, Input, Button, Card, Alert, Divider } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  loginStart,
  loginSuccess,
  loginFailure,
} from "../../store/slices/authSlice";
import { authAPI } from "../../services/api";

const Login = () => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector(
    (state) => state.auth,
  );

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const onFinish = async (values) => {
    dispatch(loginStart());
    try {
      const payload = {
        username: values.username?.trim().toLowerCase(),
        password: values.password,
      };

      const response = await authAPI.login(payload);
      const { user, token } = response.data || {};

      dispatch(loginSuccess({ user, token }));
      navigate("/dashboard");
    } catch (err) {
      dispatch(
        loginFailure(
          err.response?.data?.message ||
            err.response?.data?.error ||
            "Login failed",
        ),
      );
    }
  };

  return (
    <Card
      title="Welcome Back"
      className="shadow-lg"
      extra={<Link to="/auth/forgot-password">Forgot Password?</Link>}
    >
      {error && (
        <Alert
          message="Login Error"
          description={error}
          type="error"
          showIcon
          className="mb-4"
        />
      )}

      <Form
        form={form}
        name="login"
        onFinish={onFinish}
        layout="vertical"
        size="large"
      >
        <Form.Item
          name="username"
          rules={[
            { required: true, message: "Please input your username!" },
            { min: 3, message: "Username must be at least 3 characters!" },
          ]}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder="Username"
            autoComplete="username"
          />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[{ required: true, message: "Please input your password!" }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Password" />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            className="w-full"
            loading={loading}
          >
            Log in
          </Button>
        </Form.Item>
      </Form>

      {/* <Divider>Demo Accounts</Divider> */}

      {/* <div className="space-y-2 text-sm text-gray-600">
        <div><strong>Admin:</strong> admin@gmail.com / 123456</div>
        <div><strong>Master Agent:</strong> master@gmail.com / 123456</div>
        <div><strong>Agent:</strong> agent@gmail.com / 123456</div>
      </div> */}
    </Card>
  );
};

export default Login;
