public class Customer{
    private final String name;
    private final String id;

    public Customer(String name, String id){
        if (name== null || name.isBlank()){
            throw new IllegalArgumentException("Name is required");
            }
        
        if (id==null || id.isBlank()){
            throw new IllegalArgumentException("Id is required");
        }
        this.name=name;
        this.id=id;
    }

    public String getName(){
        return name;
    }

    public String getId(){
        return id;
    }

}