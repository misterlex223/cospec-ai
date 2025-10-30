# Architecture Documentation Generation Prompt

Generate comprehensive architecture documentation for an API project.

## Structure

### 1. System Overview
- High-level description of the system
- Key objectives and design principles
- Technology stack overview

### 2. Architecture Diagram
- Include ASCII art or mermaid diagram syntax
- Show major components and their relationships
- Data flow between components

### 3. Component Architecture
For each major component:
- Purpose and responsibilities
- Technologies used
- Interfaces (APIs, events)
- Dependencies

#### Common Components:
- **API Layer**: REST endpoints, routing, middleware
- **Business Logic Layer**: Services, domain logic
- **Data Access Layer**: Repositories, ORM
- **External Integrations**: Third-party APIs, webhooks
- **Caching Layer**: Redis, in-memory caching
- **Message Queue**: Event processing, async tasks
- **Authentication Service**: Token management, authorization

### 4. Data Architecture
- Database schema overview
- Data models and relationships
- Caching strategy
- Data flow diagrams

### 5. Security Architecture
- Authentication flow
- Authorization model
- API key management
- Secrets management
- Security layers

### 6. Deployment Architecture
- Infrastructure components
- Container orchestration
- Load balancing
- CDN setup
- Monitoring and logging infrastructure

### 7. Scalability Patterns
- Horizontal vs vertical scaling
- Load balancing strategy
- Caching strategy
- Database sharding (if applicable)

### 8. Integration Patterns
- API Gateway pattern
- Service mesh (if applicable)
- Event-driven architecture
- Webhook handling

### 9. Technology Choices
For each major technology, explain:
- Why it was chosen
- Alternatives considered
- Trade-offs

### 10. Future Considerations
- Planned improvements
- Scalability roadmap
- Technical debt items

Use diagrams and clear explanations. Include code examples where helpful.
