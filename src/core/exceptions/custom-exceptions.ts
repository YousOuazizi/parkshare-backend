import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base application exception with enhanced error context
 */
export class BaseAppException extends HttpException {
  public readonly timestamp: string;
  public readonly path?: string | undefined;
  public readonly context?: Record<string, any> | undefined;
  public readonly correlationId?: string | undefined;

  constructor(
    message: string,
    status: HttpStatus,
    context?: Record<string, any>,
    correlationId?: string,
    path?: string,
  ) {
    super(message, status);
    this.timestamp = new Date().toISOString();
    this.context = context;
    this.correlationId = correlationId;
    this.path = path;
  }
}

/**
 * Business logic validation exception
 */
export class BusinessValidationException extends BaseAppException {
  constructor(
    message: string,
    context?: Record<string, any>,
    correlationId?: string,
    path?: string,
  ) {
    super(message, HttpStatus.BAD_REQUEST, context, correlationId, path);
  }
}

/**
 * Resource access permission exception
 */
export class InsufficientPermissionsException extends BaseAppException {
  public readonly requiredPermissions: string[];
  public readonly userPermissions: string[];

  constructor(
    message: string,
    requiredPermissions: string[] = [],
    userPermissions: string[] = [],
    context?: Record<string, any>,
    correlationId?: string,
    path?: string,
  ) {
    super(message, HttpStatus.FORBIDDEN, context, correlationId, path);
    this.requiredPermissions = requiredPermissions;
    this.userPermissions = userPermissions;
  }
}

/**
 * Resource not found with detailed context
 */
export class ResourceNotFoundException extends BaseAppException {
  public readonly resourceType: string;
  public readonly resourceId: string;

  constructor(
    resourceType: string,
    resourceId: string,
    context?: Record<string, any>,
    correlationId?: string,
    path?: string,
  ) {
    const message = `${resourceType} with ID '${resourceId}' not found`;
    super(message, HttpStatus.NOT_FOUND, context, correlationId, path);
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * Resource conflict exception (e.g., duplicate entries, booking conflicts)
 */
export class ResourceConflictException extends BaseAppException {
  public readonly conflictType: string;

  constructor(
    message: string,
    conflictType: string,
    context?: Record<string, any>,
    correlationId?: string,
    path?: string,
  ) {
    super(message, HttpStatus.CONFLICT, context, correlationId, path);
    this.conflictType = conflictType;
  }
}

/**
 * External service integration exception
 */
export class ExternalServiceException extends BaseAppException {
  public readonly serviceName: string;
  public readonly serviceError: string;

  constructor(
    serviceName: string,
    serviceError: string,
    message?: string,
    context?: Record<string, any>,
    correlationId?: string,
    path?: string,
  ) {
    const errorMessage =
      message || `External service '${serviceName}' error: ${serviceError}`;
    super(errorMessage, HttpStatus.BAD_GATEWAY, context, correlationId, path);
    this.serviceName = serviceName;
    this.serviceError = serviceError;
  }
}

/**
 * Rate limiting exception
 */
export class RateLimitException extends BaseAppException {
  public readonly limitType: string;
  public readonly resetTime: Date;
  public readonly currentCount: number;
  public readonly maxCount: number;

  constructor(
    limitType: string,
    currentCount: number,
    maxCount: number,
    resetTime: Date,
    context?: Record<string, any>,
    correlationId?: string,
    path?: string,
  ) {
    const message = `Rate limit exceeded for ${limitType}: ${currentCount}/${maxCount}. Resets at ${resetTime.toISOString()}`;
    super(message, HttpStatus.TOO_MANY_REQUESTS, context, correlationId, path);
    this.limitType = limitType;
    this.resetTime = resetTime;
    this.currentCount = currentCount;
    this.maxCount = maxCount;
  }
}

/**
 * Payment processing exception
 */
export class PaymentException extends BaseAppException {
  public readonly paymentProvider: string;
  public readonly paymentId?: string | undefined;
  public readonly errorCode?: string | undefined;

  constructor(
    message: string,
    paymentProvider: string,
    paymentId?: string,
    errorCode?: string,
    context?: Record<string, any>,
    correlationId?: string,
    path?: string,
  ) {
    super(message, HttpStatus.PAYMENT_REQUIRED, context, correlationId, path);
    this.paymentProvider = paymentProvider;
    this.paymentId = paymentId;
    this.errorCode = errorCode;
  }
}

/**
 * Verification level insufficient exception
 */
export class InsufficientVerificationException extends BaseAppException {
  public readonly currentLevel: number;
  public readonly requiredLevel: number;
  public readonly nextSteps: string[];

  constructor(
    currentLevel: number,
    requiredLevel: number,
    nextSteps: string[] = [],
    context?: Record<string, any>,
    correlationId?: string,
    path?: string,
  ) {
    const message = `Insufficient verification level. Current: ${currentLevel}, Required: ${requiredLevel}`;
    super(message, HttpStatus.FORBIDDEN, context, correlationId, path);
    this.currentLevel = currentLevel;
    this.requiredLevel = requiredLevel;
    this.nextSteps = nextSteps;
  }
}

/**
 * File processing exception
 */
export class FileProcessingException extends BaseAppException {
  public readonly fileName: string;
  public readonly fileType: string;
  public readonly processingStep: string;

  constructor(
    fileName: string,
    fileType: string,
    processingStep: string,
    message: string,
    context?: Record<string, any>,
    correlationId?: string,
    path?: string,
  ) {
    super(
      message,
      HttpStatus.UNPROCESSABLE_ENTITY,
      context,
      correlationId,
      path,
    );
    this.fileName = fileName;
    this.fileType = fileType;
    this.processingStep = processingStep;
  }
}

/**
 * Database operation exception
 */
export class DatabaseOperationException extends BaseAppException {
  public readonly operation: string;
  public readonly entity: string;

  constructor(
    operation: string,
    entity: string,
    message: string,
    context?: Record<string, any>,
    correlationId?: string,
    path?: string,
  ) {
    super(
      message,
      HttpStatus.INTERNAL_SERVER_ERROR,
      context,
      correlationId,
      path,
    );
    this.operation = operation;
    this.entity = entity;
  }
}
