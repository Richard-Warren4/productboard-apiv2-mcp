# ProductBoard Workflow Skills

Common workflows for managing ProductBoard features with Claude.

## Viewing Features

### List all features
```
Show me all ProductBoard features
```

### Filter by team
```
List features for the Platform team
```

### Filter by status
```
Show features with status "In Progress"
```

## Getting Details

### By ID
```
Get details for feature abc123-def456-...
```

### By name
```
Show me the "User Authentication" feature
```

## Creating Features

### Basic feature
```
Create a feature called "Dark Mode Support"
```

### With details
```
Create a feature called "API Rate Limiting" with status "Planned" for the Backend team
```

## Updating Features

### Change status
```
Update feature abc123 to status "In Progress"
```

### Change owner
```
Assign feature abc123 to jane@company.com
```

### Multiple changes
```
Update feature abc123: set status to "Released" and team to "Platform"
```

## Searching

### By name
```
Find features containing "authentication"
```

### By status
```
Search for features with status "Released" or "In Progress"
```

### Combined filters
```
Find "API" features with status "Planned" for the Backend team
```

## Managing Relationships

### View relationships
```
Show relationships for feature abc123
```

### Link to component
```
Link feature abc123 to component xyz789
```

### Remove relationship
```
Remove feature abc123 from its parent
```

## Tips

- Use feature IDs for precision, names for convenience
- Status names must match exactly (case-insensitive)
- Team filtering works with both IDs and names
- Pagination is automatic - ask for "more" to continue
