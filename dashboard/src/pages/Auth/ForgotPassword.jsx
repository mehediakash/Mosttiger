import React, { useEffect } from 'react';
import { Form, Input, Button, Card, Alert, Typography } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { forgotPassword, resetForgotPassword, clearError } from '../../store/slices/authSlice';

const { Title, Text } = Typography;

const ForgotPassword = () => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const { 
    forgotPasswordLoading, 
    forgotPasswordError, 
    forgotPasswordSuccess 
  } = useSelector(state => state.auth);

  useEffect(() => {
    // Reset state when component mounts
    dispatch(resetForgotPassword());
    dispatch(clearError());
  }, [dispatch]);

  const onFinish = async (values) => {
    dispatch(forgotPassword(values));
  };

  return (
    <Card className="shadow-lg">
      <div className="text-center mb-6">
        <Link to="/auth/login" className="float-left">
          <ArrowLeftOutlined /> Back to Login
        </Link>
        <Title level={3} className="mb-2">Reset Your Password</Title>
        <Text type="secondary">
          Enter your email address and we'll send you instructions to reset your password.
        </Text>
      </div>

      {forgotPasswordError && (
        <Alert
          message="Error"
          description={forgotPasswordError}
          type="error"
          showIcon
          className="mb-4"
        />
      )}

      {forgotPasswordSuccess ? (
        <div className="text-center py-4">
          <div className="text-green-500 text-4xl mb-4">✓</div>
          <Title level={4} className="text-green-600">Check Your Email</Title>
          <Text>
            We've sent password reset instructions to your email address.
          </Text>
          <div className="mt-4">
            <Link to="/auth/login">
              <Button type="primary">Return to Login</Button>
            </Link>
          </div>
        </div>
      ) : (
        <Form
          form={form}
          name="forgotPassword"
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please input your email!' },
              { type: 'email', message: 'Please enter a valid email!' },
            ]}
          >
            <Input 
              prefix={<MailOutlined />} 
              placeholder="Enter your email address" 
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              className="w-full" 
              loading={forgotPasswordLoading}
            >
              Send Reset Instructions
            </Button>
          </Form.Item>
        </Form>
      )}
    </Card>
  );
};

export default ForgotPassword;