import React from 'react';
import { render, screen } from '@testing-library/react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { expect } from '@jest/globals';

describe('Avatar Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('Avatarコンポーネントをレンダリングする', () => {
    render(<Avatar data-testid="avatar" />);
    
    const avatar = screen.getByTestId('avatar');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveClass('relative');
  });
  
  it('AvatarFallbackをレンダリングする', () => {
    render(
      <Avatar>
        <AvatarFallback data-testid="avatar-fallback">TS</AvatarFallback>
      </Avatar>
    );
    
    const avatarFallback = screen.getByTestId('avatar-fallback');
    expect(avatarFallback).toBeInTheDocument();
    expect(avatarFallback).toHaveTextContent('TS');
  });
  
  it('カスタムクラス名を適用する', () => {
    render(
      <Avatar className="custom-avatar" data-testid="avatar">
        <AvatarFallback 
          className="custom-fallback"
          data-testid="avatar-fallback"
        >
          TS
        </AvatarFallback>
      </Avatar>
    );
    
    const avatar = screen.getByTestId('avatar');
    const avatarFallback = screen.getByTestId('avatar-fallback');
    
    expect(avatar).toHaveClass('custom-avatar');
    expect(avatarFallback).toHaveClass('custom-fallback');
  });
}); 